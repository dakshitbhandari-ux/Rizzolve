"""
Persistent shared doubt storage for Rizzolve / Doubt Chain.
Stores doubts on disk in JSON format so doubts posted by one user
are immediately available to all other users across sessions and browsers.
All student names are deterministically anonymized to 'Random 1', 'Random 2', etc.
"""

import json
import logging
import os
import re
import threading
from datetime import datetime

logger = logging.getLogger("spidyy.doubts")

DATA_FILE = os.path.join(os.path.dirname(__file__), "doubts.json")
_lock = threading.Lock()

KNOWN_STUDENT_MAP = {
    'aarav sharma': 'Random 1',
    'priya verma': 'Random 2',
    'dev mukherjee': 'Random 3',
    'dev m': 'Random 3',
    'dev m.': 'Random 3',
    'rohan patel': 'Random 4',
    'rohan k': 'Random 4',
    'rohan k.': 'Random 4',
    'ankit verma': 'Random 5',
    'sneha rao': 'Random 6',
    'kavya sharma': 'Random 7',
    'vikram joshi': 'Random 8',
    'ananya sen': 'Random 9',
    'bhandaridaksh07': 'Random 10',
    'student9756': 'Random 11',
    'alice cooper': 'Random 12',
    'bob dylan': 'Random 13',
}

_dynamic_counter = 14
_dynamic_map = {}


def anonymize_name(name: str) -> str:
    global _dynamic_counter
    if not name or not isinstance(name, str):
        return "Random 1"
    trimmed = name.strip()
    if re.match(r"^random\s+\d+$", trimmed, re.IGNORECASE):
        parts = trimmed.split()
        return f"Random {parts[1]}"
    if "Spidyy AI" in trimmed or "AI Academic" in trimmed:
        return trimmed
    if trimmed.startswith("Prof.") or trimmed.startswith("Dr."):
        return trimmed
    lower = trimmed.lower()
    if lower in KNOWN_STUDENT_MAP:
        return KNOWN_STUDENT_MAP[lower]
    if lower in _dynamic_map:
        return _dynamic_map[lower]
    assigned = f"Random {_dynamic_counter}"
    _dynamic_counter += 1
    _dynamic_map[lower] = assigned
    return assigned


def get_anonymous_avatar(name: str) -> str:
    anon = anonymize_name(name)
    m = re.match(r"^Random\s+(\d+)$", anon, re.IGNORECASE)
    if m:
        return f"R{m.group(1)}"
    if "AI" in anon:
        return "AI"
    if anon.startswith("Prof."):
        return "PR"
    if anon.startswith("Dr."):
        return "DR"
    return anon[:2].upper()


def sanitize_doubt(d: dict) -> dict:
    if not isinstance(d, dict):
        return d
    d["author"] = anonymize_name(d.get("author", "Random 1"))
    d["authorAvatar"] = get_anonymous_avatar(d["author"])
    for ans in d.get("answers", []):
        if isinstance(ans, dict):
            ans["author"] = anonymize_name(ans.get("author", "Random 1"))
            ans["authorAvatar"] = get_anonymous_avatar(ans["author"])
    return d


INITIAL_DOUBTS = [
    {
        "id": "doubt-1",
        "title": "How does Peterson’s algorithm guarantee mutual exclusion without atomic hardware instructions (like TSL)?",
        "snippet": "I am struggling to understand step 3 in Tanenbaum where turn and interested flags interact concurrently in memory. How can two threads not overwrite each other without hardware-level locks?",
        "fullDescription": "In standard operating systems theory, Peterson's algorithm is presented as a pure software mutual exclusion solution for two processes.\n\nHowever, during concurrent execution:\n```c\nvoid enter_region(int process) {\n    int other = 1 - process;\n    interested[process] = TRUE;\n    turn = process;\n    while (turn == process && interested[other] == TRUE); // busy wait\n}\n```\n\nIf Process 0 and Process 1 both execute `turn = process` simultaneously, how does memory arbitration decide who waits without atomic CPU primitives? Does out-of-order execution in modern x86/ARM processors break this without memory barriers?",
        "subject": "Operating Systems",
        "subjectCode": "CS-302",
        "communityId": "systems-os",
        "community": "Systems & Architecture Circle",
        "author": "Random 7",
        "authorAvatar": "R7",
        "authorBatch": "B.Tech CS • Sem 4",
        "authorId": "random7@campus.edu",
        "authorEmail": "random7@campus.edu",
        "upvotes": 42,
        "upvotedBy": [],
        "bounty": 30,
        "time": "18m ago",
        "isResolved": True,
        "acceptedAnswerId": "ans-1",
        "tags": ["Concurrency", "Critical Section", "Memory Barriers"],
        "answers": [
            {
                "id": "ans-1",
                "author": "Random 2",
                "authorAvatar": "R2",
                "authorRole": "Peer Mentor • Senior Sem 6",
                "time": "12m ago",
                "text": "Great question! You've touched on two crucial aspects: **algorithmic correctness on a sequential memory model** versus **hardware reality on modern multi-core processors**.\n\n1. **Theoretical Correctness (Sequential Consistency)**:\nAt the bus level, memory writes to the shared integer `turn` are serialized by the memory controller bus arbiter. Even if both cores write at roughly the same clock cycle, one write will hit the cache line last. Whichever process writes last overwrites `turn` with its own ID, which causes that process to be trapped in the `while` loop while the other proceeds.\n\n2. **Modern Multi-Core Reality**:\nOn modern x86 or ARM CPUs with out-of-order execution and store buffers, stores can be reordered after loads unless you issue a memory fence (`mfence` or `std::atomic_thread_fence`). So in modern C++, Peterson's requires sequentially consistent atomic flags to prevent compiler and CPU reordering.",
                "upvotes": 28,
                "isAccepted": True,
            },
            {
                "id": "ans-2",
                "author": "Prof. Rajesh Nair",
                "authorAvatar": "RN",
                "authorRole": "Faculty • OS Department",
                "time": "5m ago",
                "text": "Random 2's explanation is spot on. For your mid-term exam questions, Peterson's algorithm is assumed to run on an idealized system with sequential consistency. Keep in mind that for N processes, Peterson's generalizes to Lamport's Bakery Algorithm.",
                "upvotes": 14,
                "isAccepted": False,
            },
        ],
    },
    {
        "id": "doubt-2",
        "title": "Intuitive geometric explanation for why SVD eigenvectors are orthogonal in A^T A and A A^T",
        "snippet": "When mapping an n-dimensional sphere into an ellipsoid, why do the principal axes preserve orthogonality under linear transformations?",
        "fullDescription": "We know that Singular Value Decomposition factors an m x n matrix into U Σ V^T.\n\nThe columns of V are eigenvectors of A^T A, and columns of U are eigenvectors of A A^T.\n\nCould someone provide a geometric breakdown of:\n1. Why eigenvectors of a symmetric matrix are always mutually perpendicular.\n2. How the unit sphere maps to an hyper-ellipsoid along the singular values σ_i.",
        "subject": "Applied Mathematics",
        "subjectCode": "MA-201",
        "communityId": "ml-ai",
        "community": "Machine Learning & AI Lab",
        "author": "Random 1",
        "authorAvatar": "R1",
        "authorBatch": "B.Tech CS • Sem 4",
        "authorId": "random1@campus.edu",
        "authorEmail": "random1@campus.edu",
        "upvotes": 38,
        "upvotedBy": [],
        "bounty": 45,
        "time": "42m ago",
        "isResolved": False,
        "acceptedAnswerId": None,
        "tags": ["Linear Algebra", "SVD", "Eigenvectors", "Orthogonality"],
        "answers": [
            {
                "id": "ans-3",
                "author": "Random 3",
                "authorAvatar": "R3",
                "authorRole": "Math Guild Lead • Sem 5",
                "time": "25m ago",
                "text": "Consider the Spectral Theorem for symmetric matrices: because A^T A is symmetric ($(A^T A)^T = A^T A$), its eigenvalues are guaranteed real and its eigenvectors can always be chosen orthonormal.\n\nGeometrically:\n- Start with the unit sphere ||x|| = 1.\n- The transformation y = Ax stretches this sphere into an ellipsoid.\n- The longest axis of this ellipsoid corresponds to the direction v_1 that maximizes ||Av||.\n- Because the principal axes of any ellipsoid are orthogonal by definition in Euclidean space, the resulting singular vectors form orthogonal coordinate systems before and after transformation!",
                "upvotes": 19,
                "isAccepted": False,
            }
        ],
    },
    {
        "id": "doubt-3",
        "title": "Difference between TCP CUBIC and BBR congestion control in high-latency satellite/wireless links",
        "snippet": "Loss-based vs bottleneck bandwidth estimation: why does packet loss unfairly penalize CUBIC when RTT is high, and how does BBR maintain pacing?",
        "fullDescription": "In our Computer Networks lab on Wireshark analysis:\nWhen packet loss occurs due to radio interference (not actual buffer saturation):\n- TCP Reno/CUBIC halves its congestion window (cwnd), causing throughput to plummet on a 600ms latency connection.\n- Google BBR seems to maintain steady pacing.\n\nHow does BBR decouple packet loss from network congestion?",
        "subject": "Computer Networks",
        "subjectCode": "CS-301",
        "communityId": "systems-os",
        "community": "Systems & Architecture Circle",
        "author": "Random 4",
        "authorAvatar": "R4",
        "authorBatch": "B.Tech CS • Sem 4",
        "authorId": "random4@campus.edu",
        "authorEmail": "random4@campus.edu",
        "upvotes": 29,
        "upvotedBy": [],
        "bounty": 20,
        "time": "1h ago",
        "isResolved": True,
        "acceptedAnswerId": "ans-4",
        "tags": ["Networking", "TCP CUBIC", "BBR", "Congestion Control"],
        "answers": [
            {
                "id": "ans-4",
                "author": "Random 9",
                "authorAvatar": "R9",
                "authorRole": "Teaching Assistant • Networks",
                "time": "35m ago",
                "text": "CUBIC is a **loss-based** algorithm. It assumes every packet drop is caused by router buffer overflow (congestion). On high-latency wireless or satellite links, transient radio noise drops packets even when buffers are completely empty, crippling CUBIC's window.\n\nBBR (Bottleneck Bandwidth and Round-trip propagation time) is **model-based**. It continuously measures:\n1. Maximum Delivery Rate (Bottleneck Bandwidth)\n2. Minimum Round Trip Time (RTprop)\n\nBBR paces packets at exactly the bottleneck bandwidth without filling the queue, ignoring random non-congestion packet loss until delivery rate genuinely drops.",
                "upvotes": 22,
                "isAccepted": True,
            }
        ],
    },
    {
        "id": "doubt-4",
        "title": "Proof for Red-Black tree insertion needing maximum 2 rotations while deletion may need 3",
        "snippet": "Can someone provide a concise invariant breakdown for recoloring cases vs rotation restructuring during insertion?",
        "fullDescription": "In Cormen (CLRS) Chapter 13:\nDuring RB-tree insertion, we have Cases 1, 2, and 3:\n- Case 1 (Uncle is red) is recoloring and moves up the tree.\n- Case 2 (Uncle black, zig-zag) converts to Case 3 via 1 rotation.\n- Case 3 (Uncle black, straight) performs 1 rotation and terminates.\n\nHence insertion needs at most 2 rotations. But why can deletion propagate rotations up to 3 times?",
        "subject": "Data Structures",
        "subjectCode": "CS-204",
        "communityId": "comp-prog",
        "community": "Competitive Programming Guild",
        "author": "Random 5",
        "authorAvatar": "R5",
        "authorBatch": "B.Tech CS • Sem 4",
        "authorId": "random5@campus.edu",
        "authorEmail": "random5@campus.edu",
        "upvotes": 23,
        "upvotedBy": [],
        "bounty": 50,
        "time": "3h ago",
        "isResolved": False,
        "acceptedAnswerId": None,
        "tags": ["Trees", "Red-Black Trees", "Rotations", "Algorithms"],
        "answers": [],
    },
    {
        "id": "doubt-5",
        "title": "Why is Boyce-Codd Normal Form (BCNF) strictly stronger than 3NF, and what dependency loss can occur?",
        "snippet": "Looking for a clean real-world college database example showing Functional Dependency preservation failure during BCNF decomposition...",
        "fullDescription": "A relation is in 3NF if for every non-trivial X -> Y, either X is a superkey OR Y is a prime attribute.\nIn BCNF, every determinant X MUST be a superkey without exception.\n\nCould someone show a concrete relation schema (e.g., Student, Course, Advisor) where decomposing to BCNF eliminates a transitive dependency but loses dependency preservation?",
        "subject": "Database Management",
        "subjectCode": "CS-304",
        "communityId": "gate-prep",
        "community": "GATE & Higher Studies Prep",
        "author": "Random 6",
        "authorAvatar": "R6",
        "authorBatch": "B.Tech CS • Sem 4",
        "authorId": "random6@campus.edu",
        "authorEmail": "random6@campus.edu",
        "upvotes": 19,
        "upvotedBy": [],
        "bounty": 25,
        "time": "4h ago",
        "isResolved": True,
        "acceptedAnswerId": "ans-5",
        "tags": ["Databases", "Normalization", "3NF", "BCNF"],
        "answers": [
            {
                "id": "ans-5",
                "author": "Random 1",
                "authorAvatar": "R1",
                "authorRole": "Peer Mentor",
                "time": "3h ago",
                "text": "Here is the classic textbook counter-example:\n\nConsider **Enrollment(StudentID, Subject, Advisor)** with constraints:\n1. For each student and subject, there is exactly one advisor: `(StudentID, Subject) -> Advisor`\n2. Each advisor advises only one subject: `Advisor -> Subject`\n\nCandidate Keys: `(StudentID, Subject)` and `(StudentID, Advisor)`.\nThis is in 3NF because in `Advisor -> Subject`, `Subject` is part of candidate key (prime attribute).\n\nHowever, in BCNF, `Advisor -> Subject` violates the rule because `Advisor` is not a superkey.\nDecomposing into:\n- R1: `(Advisor, Subject)`\n- R2: `(StudentID, Advisor)`\nBoth are in BCNF, but we can no longer check `(StudentID, Subject) -> Advisor` without performing an expensive join across R1 and R2! Hence dependency preservation is lost.",
                "upvotes": 18,
                "isAccepted": True,
            }
        ],
    },
]


def _read_data() -> list[dict]:
    if not os.path.exists(DATA_FILE):
        _write_data(INITIAL_DOUBTS)
        return [sanitize_doubt(dict(d)) for d in INITIAL_DOUBTS]
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            items = json.load(f)
            return [sanitize_doubt(d) for d in items]
    except Exception as e:
        logger.error("Error reading doubts data: %s", e)
        return [sanitize_doubt(dict(d)) for d in INITIAL_DOUBTS]


def _write_data(data: list[dict]):
    try:
        sanitized = [sanitize_doubt(dict(d)) for d in data]
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(sanitized, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error("Error writing doubts data: %s", e)


def get_all_doubts() -> list[dict]:
    with _lock:
        return _read_data()


def create_doubt(doubt_data: dict) -> dict:
    with _lock:
        doubts = _read_data()
        doubt_data = sanitize_doubt(doubt_data)
        if not doubt_data.get("id"):
            doubt_data["id"] = f"doubt-{int(datetime.utcnow().timestamp() * 1000)}"
        if "answers" not in doubt_data:
            doubt_data["answers"] = []
        if "upvotes" not in doubt_data:
            doubt_data["upvotes"] = 1
        if "upvotedBy" not in doubt_data:
            author_id = doubt_data.get("authorId") or doubt_data.get("authorEmail") or "author"
            doubt_data["upvotedBy"] = [author_id]
        if "time" not in doubt_data:
            doubt_data["time"] = "Just now"
        if "isResolved" not in doubt_data:
            doubt_data["isResolved"] = False
        if not doubt_data.get("communityId"):
            doubt_data["communityId"] = "apex-cs-2026"
        if not doubt_data.get("community"):
            doubt_data["community"] = "Apex CS Class of 2026"

        doubts.insert(0, doubt_data)
        _write_data(doubts)
        logger.info("Created new doubt %s: %s", doubt_data["id"], doubt_data.get("title"))
        return doubt_data


def upvote_doubt(doubt_id: str, user_id: str = "anonymous") -> dict:
    with _lock:
        doubts = _read_data()
        for d in doubts:
            if d["id"] == doubt_id:
                upvoted_by = d.setdefault("upvotedBy", [])
                if user_id in upvoted_by:
                    upvoted_by.remove(user_id)
                    d["upvotes"] = max(0, d.get("upvotes", 1) - 1)
                else:
                    upvoted_by.append(user_id)
                    d["upvotes"] = d.get("upvotes", 0) + 1
                _write_data(doubts)
                return d
        raise ValueError(f"Doubt {doubt_id} not found")


def add_answer(doubt_id: str, answer_data: dict) -> dict:
    with _lock:
        doubts = _read_data()
        for d in doubts:
            if d["id"] == doubt_id:
                if not answer_data.get("id"):
                    answer_data["id"] = f"ans-{int(datetime.utcnow().timestamp() * 1000)}"
                if "time" not in answer_data:
                    answer_data["time"] = "Just now"
                if "upvotes" not in answer_data:
                    answer_data["upvotes"] = 0
                if "isAccepted" not in answer_data:
                    answer_data["isAccepted"] = False
                answer_data["author"] = anonymize_name(answer_data.get("author", "Random 1"))
                answer_data["authorAvatar"] = get_anonymous_avatar(answer_data["author"])
                d.setdefault("answers", []).append(answer_data)
                _write_data(doubts)
                logger.info("Added answer %s to doubt %s", answer_data["id"], doubt_id)
                return d
        raise ValueError(f"Doubt {doubt_id} not found")


def accept_answer(doubt_id: str, answer_id: str) -> dict:
    with _lock:
        doubts = _read_data()
        for d in doubts:
            if d["id"] == doubt_id:
                d["isResolved"] = True
                d["acceptedAnswerId"] = answer_id
                for ans in d.get("answers", []):
                    ans["isAccepted"] = (ans["id"] == answer_id)
                _write_data(doubts)
                logger.info("Accepted answer %s for doubt %s", answer_id, doubt_id)
                return d
        raise ValueError(f"Doubt {doubt_id} not found")
