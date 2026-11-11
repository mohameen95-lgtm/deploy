# Azhar Perfumes — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Source of Truth

1. **Global Default Deny**: Any path not explicitly matched is rejected (`allow read, write: if false;`).
2. **Verified Identity Invariant**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Admin Authority Invariant**: Admin privileges are never accepted from client-supplied profile fields. Admin status is verified strictly via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or the verified runtime owner email (`request.auth.token.email == 'moh.ameen95@gmail.com' && request.auth.token.email_verified == true`).
4. **PII Split-Collection Isolation**: Customer PII (`email`, `phone`, `addressLine`, `pincode`) is isolated in `/users/{userId}/private/{docId}`, gated by the parent `/users/{userId}` document existence and accessible strictly to `isOwner(userId) || isAdmin()`.
5. **Relational & Temporal Integrity on Orders**: An order in `/orders/{orderId}` can only be created if `incoming().userId == request.auth.uid`, `exists(/databases/$(database)/documents/users/$(request.auth.uid))`, `incoming().status == 'Confirmed'`, and `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
6. **Terminal State Locking on Orders**: Once an order reaches `Delivered` or `Cancelled`, non-admin updates are permanently locked. Customers can only transition their own order from `Confirmed` to `Cancelled`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on UserProfile**: `{ uid: "user_1", displayName: "Ameen", wishlistIds: [], isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `hasOnly`.
2. **Unverified Email Admin Spoof**: Auth token `{ email: "moh.ameen95@gmail.com", email_verified: false }` attempting to create `/products/prod_1` -> Rejected by `email_verified == true` check.
3. **Cross-User Order Spoofing**: Authenticated `user_1` creating `/orders/ord_1` with `{ userId: "user_2", ... }` -> Rejected by `incoming().userId == request.auth.uid`.
4. **Orphaned Order Creation**: Authenticated `user_no_profile` creating `/orders/ord_1` before `/users/user_no_profile` exists -> Rejected by `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
5. **Order Status Shortcutting on Create**: Creating `/orders/ord_1` with `status: "Delivered"` -> Rejected by `incoming().status == 'Confirmed'`.
6. **Customer Self-Shipping Upgrade**: Customer `user_1` updating their `/orders/ord_1` status from `Confirmed` to `Shipped` -> Rejected by Action-Based Update (`incoming().status == 'Cancelled'` only for customer).
7. **Terminal State Mutation**: Customer `user_1` attempting to update an already `Delivered` order -> Rejected by Terminal State Lock.
8. **PII Cross-Read Attack**: Authenticated `user_2` calling `get` on `/users/user_1/private/shipping` -> Rejected by `isOwner(userId) || isAdmin()`.
9. **ID Poisoning Attack**: Creating `/orders/invalid$id!with@spaces` -> Rejected by `isValidId(orderId)`.
10. **Wishlist Unbounded Array Exhaustion**: Updating `/users/user_1` with 60 elements in `wishlistIds` -> Rejected by `data.wishlistIds.size() <= 50`.
11. **Timestamp Forgery**: Creating `/orders/ord_1` with a backdated `createdAt` timestamp -> Rejected by `incoming().createdAt == request.time`.
12. **Immortal Field Mutation**: Updating `/orders/ord_1` to change `createdAt` or `userId` -> Rejected by `incoming().userId == existing().userId && incoming().createdAt == existing().createdAt`.
