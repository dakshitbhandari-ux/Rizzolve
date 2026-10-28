# Doubt Chain Database Schema

This schema is designed to support a multi-tenant SaaS architecture. Every core entity includes a `universityId` to ensure data isolation. The structure is represented in a generic format that can be easily adapted to MongoDB (Mongoose) or PostgreSQL.

## 1. University (Tenant)
Stores the overarching institution details.
* `id`: UUID / ObjectID
* `name`: String (e.g., "SRM University")
* `allowedDomains`: Array of Strings (e.g., ["@srm.edu", "@srmist.edu"]) - *Used to restrict sign-ups.*
* `createdAt`: Timestamp

## 2. User
Stores student and faculty profiles, including their gamification stats.
* `id`: UUID / ObjectID
* `universityId`: Reference to University - *Ensures user belongs to a specific tenant.*
* `name`: String
* `email`: String
* `role`: Enum ("STUDENT", "FACULTY", "ADMIN")
* `reputation`: Integer (Default: 0) - *Increases on upvotes/accepted answers.*
* `badges`: Array of Strings - *Optional: visual flair based on reputation tiers.*
* `createdAt`: Timestamp

## 3. Community (Board/Course)
Represents a specific subject, course code, or general discussion area.
* `id`: UUID / ObjectID
* `universityId`: Reference to University
* `name`: String (e.g., "CS-304 Data Structures")
* `description`: String
* `isPrivate`: Boolean - *If true, requires an invite or join code.*
* `joinCode`: String (Nullable) - *Code for students to join private boards.*
* `moderators`: Array of User References (Faculty/TAs)
* `createdAt`: Timestamp

## 4. Doubt (Question)
The core post created by a user.
* `id`: UUID / ObjectID
* `universityId`: Reference to University
* `communityId`: Reference to Community
* `authorId`: Reference to User
* `title`: String - *Indexed for fast "search-before-posting" duplicate detection.*
* `body`: String (Markdown/HTML)
* `status`: Enum ("OPEN", "RESOLVED", "BOUNTIED")
* `bountyAmount`: Integer (Default: 0) - *Reputation points locked by the author.*
* `upvotedBy`: Array of User References
* `downvotedBy`: Array of User References
* `netScore`: Integer - *(Upvotes - Downvotes) for easy sorting.*
* `resolvedAnswerId`: Reference to Answer (Nullable)
* `createdAt`: Timestamp

## 5. Answer
Replies attached to a specific Doubt.
* `id`: UUID / ObjectID
* `doubtId`: Reference to Doubt
* `authorId`: Reference to User
* `body`: String (Markdown/HTML)
* `isAccepted`: Boolean - *Marked true by the Doubt author (awards bounty/reputation).*
* `isInstructorEndorsed`: Boolean - *Marked true by a Faculty member.*
* `upvotedBy`: Array of User References
* `downvotedBy`: Array of User References
* `netScore`: Integer
* `createdAt`: Timestamp