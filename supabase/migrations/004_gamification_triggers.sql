-- ==============================================================================
-- Migration: 004_gamification_triggers.sql
-- Description: Automated Gamification Engine (Votes, Reputation & Bounties)
-- Components:
--   1. handle_answer_vote(): Fires BEFORE INSERT/UPDATE of upvoted_by / downvoted_by on answers.
--      - Updates net_score on answers.
--      - Dynamically awards/deducts author reputation (+10 upvote, -2 downvote).
--   2. handle_accepted_answer(): Fires AFTER UPDATE of is_accepted on answers.
--      - Awards doubt bounty_amount + 15 base reputation points to the answer author.
--      - Updates parent doubt status to 'RESOLVED' and sets resolved_answer_id.
--      - Automatically handles and reverses points if unaccepted to prevent score inflation.
-- ==============================================================================

-- ==============================================================================
-- 1. VOTE & REPUTATION TRIGGER (ANSWERS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_answer_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_upvotes INTEGER := 0;
  new_upvotes INTEGER := 0;
  old_downvotes INTEGER := 0;
  new_downvotes INTEGER := 0;
  upvote_delta INTEGER := 0;
  downvote_delta INTEGER := 0;
  reputation_change INTEGER := 0;
BEGIN
  -- 1. Determine vote counts
  new_upvotes := COALESCE(cardinality(NEW.upvoted_by), 0);
  new_downvotes := COALESCE(cardinality(NEW.downvoted_by), 0);

  IF TG_OP = 'UPDATE' THEN
    old_upvotes := COALESCE(cardinality(OLD.upvoted_by), 0);
    old_downvotes := COALESCE(cardinality(OLD.downvoted_by), 0);
  END IF;

  -- 2. Maintain precalculated net_score on the answer row
  NEW.net_score := new_upvotes - new_downvotes;

  -- 3. Calculate reputation deltas: +10 per upvote, -2 per downvote
  upvote_delta := new_upvotes - old_upvotes;
  downvote_delta := new_downvotes - old_downvotes;
  reputation_change := (upvote_delta * 10) + (downvote_delta * -2);

  -- 4. Apply reputation change to the author's profile (prevent negative reputation floor)
  IF reputation_change <> 0 THEN
    UPDATE public.profiles
    SET
      reputation = GREATEST(0, reputation + reputation_change),
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.author_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if existing
DROP TRIGGER IF EXISTS trg_answer_votes ON public.answers;

-- Attach trigger BEFORE INSERT OR UPDATE of vote arrays on answers
CREATE TRIGGER trg_answer_votes
  BEFORE INSERT OR UPDATE OF upvoted_by, downvoted_by
  ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_answer_vote();


-- ==============================================================================
-- 2. ACCEPTED ANSWER & BOUNTY TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_accepted_answer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_doubt RECORD;
  doubt_bounty INTEGER := 0;
  total_bonus INTEGER := 0;
BEGIN
  -- Fetch parent doubt metadata
  SELECT id, author_id, bounty_amount, status
  INTO parent_doubt
  FROM public.doubts
  WHERE id = NEW.doubt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent doubt % not found for answer %', NEW.doubt_id, NEW.id;
  END IF;

  doubt_bounty := COALESCE(parent_doubt.bounty_amount, 0);
  total_bonus := doubt_bounty + 15; -- Bounty pledge + 15 base reputation reward

  -- --------------------------------------------------------------------------
  -- CASE A: Answer marked as accepted (is_accepted: false/null -> true)
  -- --------------------------------------------------------------------------
  IF NEW.is_accepted = true AND (OLD.is_accepted IS DISTINCT FROM true) THEN

    -- Optional Authorization Guard: If executed within user session, only doubt author can accept
    IF auth.uid() IS NOT NULL AND auth.uid() <> parent_doubt.author_id THEN
      RAISE EXCEPTION 'Unauthorized: Only the author of the doubt can accept an answer.'
        USING ERRCODE = '42501';
    END IF;

    -- 1. Unmark any other answer previously accepted for this doubt (single-winner policy)
    UPDATE public.answers
    SET
      is_accepted = false,
      updated_at = timezone('utc'::text, now())
    WHERE doubt_id = NEW.doubt_id
      AND id <> NEW.id
      AND is_accepted = true;

    -- 2. Award reputation to the accepted answer author (bounty + 15)
    UPDATE public.profiles
    SET
      reputation = reputation + total_bonus,
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.author_id;

    -- 3. Mark parent doubt as RESOLVED and link the winning answer
    UPDATE public.doubts
    SET
      status = 'RESOLVED',
      resolved_answer_id = NEW.id,
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.doubt_id;

  -- --------------------------------------------------------------------------
  -- CASE B: Answer unaccepted (is_accepted: true -> false)
  -- Reverts reputation points and restores doubt status to prevent vote-farming exploits.
  -- --------------------------------------------------------------------------
  ELSIF NEW.is_accepted = false AND OLD.is_accepted = true THEN

    -- 1. Deduct the awarded points from the answer author
    UPDATE public.profiles
    SET
      reputation = GREATEST(0, reputation - total_bonus),
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.author_id;

    -- 2. Restore parent doubt status based on whether a bounty is active
    UPDATE public.doubts
    SET
      status = CASE
        WHEN bounty_amount > 0 THEN 'BOUNTIED'::public.doubt_status
        ELSE 'OPEN'::public.doubt_status
      END,
      resolved_answer_id = NULL,
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.doubt_id;

  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if existing
DROP TRIGGER IF EXISTS trg_accepted_answer ON public.answers;

-- Attach trigger AFTER UPDATE of is_accepted on answers
CREATE TRIGGER trg_accepted_answer
  AFTER UPDATE OF is_accepted
  ON public.answers
  FOR EACH ROW
  WHEN (NEW.is_accepted IS DISTINCT FROM OLD.is_accepted)
  EXECUTE FUNCTION public.handle_accepted_answer();
