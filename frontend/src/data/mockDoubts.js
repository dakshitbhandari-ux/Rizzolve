export const initialDoubtList = [
  {
    id: 'doubt-1',
    title: 'How does Peterson’s algorithm guarantee mutual exclusion without atomic hardware instructions (like TSL)?',
    snippet: 'I am struggling to understand step 3 in Tanenbaum where turn and interested flags interact concurrently in memory. How can two threads not overwrite each other without hardware-level locks?',
    fullDescription: `In standard operating systems theory, Peterson's algorithm is presented as a pure software mutual exclusion solution for two processes.

However, during concurrent execution:
\`\`\`c
void enter_region(int process) {
    int other = 1 - process;
    interested[process] = TRUE;
    turn = process;
    while (turn == process && interested[other] == TRUE); // busy wait
}
\`\`\`

If Process 0 and Process 1 both execute \`turn = process\` simultaneously, how does memory arbitration decide who waits without atomic CPU primitives? Does out-of-order execution in modern x86/ARM processors break this without memory barriers?`,
    subject: 'Operating Systems',
    subjectCode: 'CS-302',
    communityId: 'systems-os',
    community: 'Systems & Architecture Circle',
    author: 'Random 7',
    authorAvatar: 'R7',
    authorBatch: 'B.Tech CS • Sem 4',
    authorId: 'user-random7',
    isMyQuestion: false,
    upvotes: 42,
    userUpvoted: false,
    bounty: 30,
    time: '18m ago',
    isResolved: true,
    acceptedAnswerId: 'ans-1',
    tags: ['Concurrency', 'Critical Section', 'Memory Barriers'],
    answers: [
      {
        id: 'ans-1',
        author: 'Random 2',
        authorAvatar: 'R2',
        authorRole: 'Peer Mentor • Senior Sem 6',
        time: '12m ago',
        text: `Great question! You've touched on two crucial aspects: **algorithmic correctness on a sequential memory model** versus **hardware reality on modern multi-core processors**.

1. **Theoretical Correctness (Sequential Consistency)**:
At the bus level, memory writes to the shared integer \`turn\` are serialized by the memory controller bus arbiter. Even if both cores write at roughly the same clock cycle, one write will hit the cache line last. Whichever process writes last overwrites \`turn\` with its own ID, which causes that process to be trapped in the \`while\` loop while the other proceeds.

2. **Modern Multi-Core Reality**:
On modern x86 or ARM CPUs with out-of-order execution and store buffers, stores can be reordered after loads unless you issue a memory fence (\`mfence\` or \`std::atomic_thread_fence\`). So in modern C++, Peterson's requires sequentially consistent atomic flags to prevent compiler and CPU reordering.`,
        upvotes: 28,
        userUpvoted: true,
        isAccepted: true,
      },
      {
        id: 'ans-2',
        author: 'Prof. Rajesh Nair',
        authorAvatar: 'RN',
        authorRole: 'Faculty • OS Department',
        time: '5m ago',
        text: `Random 2's explanation is spot on. For your mid-term exam questions, Peterson's algorithm is assumed to run on an idealized system with sequential consistency. Keep in mind that for N processes, Peterson's generalizes to Lamport's Bakery Algorithm.`,
        upvotes: 14,
        userUpvoted: false,
        isAccepted: false,
      },
    ],
  },
  {
    id: 'doubt-2',
    title: 'Intuitive geometric explanation for why SVD eigenvectors are orthogonal in A^T A and A A^T',
    snippet: 'When mapping an n-dimensional sphere into an ellipsoid, why do the principal axes preserve orthogonality under linear transformations?',
    fullDescription: `We know that Singular Value Decomposition factors an m x n matrix into U Σ V^T. 

The columns of V are eigenvectors of A^T A, and columns of U are eigenvectors of A A^T. 

Could someone provide a geometric breakdown of:
1. Why eigenvectors of a symmetric matrix are always mutually perpendicular.
2. How the unit sphere maps to an hyper-ellipsoid along the singular values σ_i.`,
    subject: 'Applied Mathematics',
    subjectCode: 'MA-201',
    communityId: 'ml-ai',
    community: 'Machine Learning & AI Lab',
    author: 'Random 1', // Current User
    authorAvatar: 'R1',
    authorBatch: 'B.Tech CS • Sem 4',
    authorId: 'user-random1',
    isMyQuestion: true,
    upvotes: 38,
    userUpvoted: true,
    bounty: 45,
    time: '42m ago',
    isResolved: false,
    acceptedAnswerId: null,
    tags: ['Linear Algebra', 'SVD', 'Eigenvectors', 'Orthogonality'],
    answers: [
      {
        id: 'ans-3',
        author: 'Random 3',
        authorAvatar: 'R3',
        authorRole: 'Math Guild Lead • Sem 5',
        time: '25m ago',
        text: `Consider the Spectral Theorem for symmetric matrices: because A^T A is symmetric ($ (A^T A)^T = A^T A $), its eigenvalues are guaranteed real and its eigenvectors can always be chosen orthonormal.

Geometrically:
- Start with the unit sphere $ ||x|| = 1 $.
- The transformation $ y = Ax $ stretches this sphere into an ellipsoid.
- The longest axis of this ellipsoid corresponds to the direction $ v_1 $ that maximizes $ ||Av|| $.
- Because the principal axes of any ellipsoid are orthogonal by definition in Euclidean space, the resulting singular vectors form orthogonal coordinate systems before and after transformation!`,
        upvotes: 19,
        userUpvoted: false,
        isAccepted: false,
      },
    ],
  },
  {
    id: 'doubt-3',
    title: 'Difference between TCP CUBIC and BBR congestion control in high-latency satellite/wireless links',
    snippet: 'Loss-based vs bottleneck bandwidth estimation: why does packet loss unfairly penalize CUBIC when RTT is high, and how does BBR maintain pacing?',
    fullDescription: `In our Computer Networks lab on Wireshark analysis:
When packet loss occurs due to radio interference (not actual buffer saturation):
- TCP Reno/CUBIC halves its congestion window (cwnd), causing throughput to plummet on a 600ms latency connection.
- Google BBR seems to maintain steady pacing.

How does BBR decouple packet loss from network congestion?`,
    subject: 'Computer Networks',
    subjectCode: 'CS-301',
    communityId: 'systems-os',
    community: 'Systems & Architecture Circle',
    author: 'Random 4',
    authorAvatar: 'R4',
    authorBatch: 'B.Tech CS • Sem 4',
    authorId: 'user-random4',
    isMyQuestion: false,
    upvotes: 29,
    userUpvoted: false,
    bounty: 20,
    time: '1h ago',
    isResolved: true,
    acceptedAnswerId: 'ans-4',
    tags: ['Networking', 'TCP CUBIC', 'BBR', 'Congestion Control'],
    answers: [
      {
        id: 'ans-4',
        author: 'Random 9',
        authorAvatar: 'R9',
        authorRole: 'Teaching Assistant • Networks',
        time: '35m ago',
        text: `CUBIC is a **loss-based** algorithm. It assumes every packet drop is caused by router buffer overflow (congestion). On high-latency wireless or satellite links, transient radio noise drops packets even when buffers are completely empty, crippling CUBIC's window.

BBR (Bottleneck Bandwidth and Round-trip propagation time) is **model-based**. It continuously measures:
1. Maximum Delivery Rate (Bottleneck Bandwidth)
2. Minimum Round Trip Time (RTprop)

BBR paces packets at exactly the bottleneck bandwidth without filling the queue, ignoring random non-congestion packet loss until delivery rate genuinely drops.`,
        upvotes: 22,
        userUpvoted: true,
        isAccepted: true,
      },
    ],
  },
  {
    id: 'doubt-4',
    title: 'Proof for Red-Black tree insertion needing maximum 2 rotations while deletion may need 3',
    snippet: 'Can someone provide a concise invariant breakdown for recoloring cases vs rotation restructuring during insertion?',
    fullDescription: `In Cormen (CLRS) Chapter 13:
During RB-tree insertion, we have Cases 1, 2, and 3:
- Case 1 (Uncle is red) is recoloring and moves up the tree.
- Case 2 (Uncle black, zig-zag) converts to Case 3 via 1 rotation.
- Case 3 (Uncle black, straight) performs 1 rotation and terminates.

Hence insertion needs at most 2 rotations. But why can deletion propagate rotations up to 3 times?`,
    subject: 'Data Structures',
    subjectCode: 'CS-204',
    communityId: 'comp-prog',
    community: 'Competitive Programming Guild',
    author: 'Random 5',
    authorAvatar: 'R5',
    authorBatch: 'B.Tech CS • Sem 4',
    authorId: 'user-random5',
    isMyQuestion: false,
    upvotes: 23,
    userUpvoted: false,
    bounty: 50,
    time: '3h ago',
    isResolved: false,
    acceptedAnswerId: null,
    tags: ['Trees', 'Red-Black Trees', 'Rotations', 'Algorithms'],
    answers: [],
  },
  {
    id: 'doubt-5',
    title: 'Why is Boyce-Codd Normal Form (BCNF) strictly stronger than 3NF, and what dependency loss can occur?',
    snippet: 'Looking for a clean real-world college database example showing Functional Dependency preservation failure during BCNF decomposition...',
    fullDescription: `A relation is in 3NF if for every non-trivial X -> Y, either X is a superkey OR Y is a prime attribute.
In BCNF, every determinant X MUST be a superkey without exception.

Could someone show a concrete relation schema (e.g., Student, Course, Advisor) where decomposing to BCNF eliminates a transitive dependency but loses dependency preservation?`,
    subject: 'Database Management',
    subjectCode: 'CS-304',
    communityId: 'gate-prep',
    community: 'GATE & Higher Studies Prep',
    author: 'Random 6',
    authorAvatar: 'R6',
    authorBatch: 'B.Tech CS • Sem 4',
    authorId: 'user-random6',
    isMyQuestion: false,
    upvotes: 19,
    userUpvoted: false,
    bounty: 25,
    time: '4h ago',
    isResolved: true,
    acceptedAnswerId: 'ans-5',
    tags: ['Databases', 'Normalization', '3NF', 'BCNF'],
    answers: [
      {
        id: 'ans-5',
        author: 'Random 1', // Current user answered
        authorAvatar: 'R1',
        authorRole: 'Peer Mentor',
        time: '3h ago',
        text: `Here is the classic textbook counter-example:

Consider **Enrollment(StudentID, Subject, Advisor)** with constraints:
1. For each student and subject, there is exactly one advisor: \`(StudentID, Subject) -> Advisor\`
2. Each advisor advises only one subject: \`Advisor -> Subject\`

Candidate Keys: \`(StudentID, Subject)\` and \`(StudentID, Advisor)\`.
This is in 3NF because in \`Advisor -> Subject\`, \`Subject\` is part of candidate key (prime attribute).

However, in BCNF, \`Advisor -> Subject\` violates the rule because \`Advisor\` is not a superkey.
Decomposing into:
- R1: \`(Advisor, Subject)\`
- R2: \`(StudentID, Advisor)\`
Both are in BCNF, but we can no longer check \`(StudentID, Subject) -> Advisor\` without performing an expensive join across R1 and R2! Hence dependency preservation is lost.`,
        upvotes: 18,
        userUpvoted: false,
        isAccepted: true,
      },
    ],
  },
  {
    id: 'doubt-6',
    title: 'Carnot cycle vs Stirling cycle: Practical regeneration efficiency in thermal power plants',
    snippet: 'Why cannot real power plants implement the ideal Carnot cycle, and how does the Rankine cycle address two-phase wet steam pumping?',
    fullDescription: `Thermodynamics theoretical question:
We know the Carnot efficiency is η = 1 - T_C/T_H.
Why can we not compress wet steam during the isothermal condensation phase without cavitation destroying the boiler compressor feedpump?`,
    subject: 'Physics & Mechanical',
    subjectCode: 'ME-101',
    author: 'Random 8',
    authorAvatar: 'R8',
    authorBatch: 'B.Tech Mech • Sem 4',
    authorId: 'user-random8',
    isMyQuestion: false,
    upvotes: 15,
    userUpvoted: false,
    bounty: 20,
    time: '6h ago',
    isResolved: false,
    acceptedAnswerId: null,
    tags: ['Thermodynamics', 'Carnot', 'Rankine', 'Efficiency'],
    answers: [],
  },
]
