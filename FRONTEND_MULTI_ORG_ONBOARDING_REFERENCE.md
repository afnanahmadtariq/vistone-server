# Frontend Reference: Multi-Organization & Onboarding Setup

## 1. Multiple Organizations Support

Users (including Contributors, Managers, etc.) can now be a part of **multiple organizations**. The `AuthUser` object (returned by login/registration and `me` endpoints) has been updated to return an `organizations` array representing all of the user's active memberships.

### Payload Changes

The `AuthUser` data returned now includes `organizations`:

```graphql
type AuthUser {
  id: ID!
  email: String!
  name: String
  role: String
  organizationId: ID
  organization: AuthOrganization
  organizations: [AuthOrganizationMembership!]  # <-- NEW
  permissions: JSON
}

type AuthOrganizationMembership {
  id: ID!
  role: String       # e.g., 'manager', 'contributor'
  organization: {
    id: ID!
    name: String!
    slug: String!
  }
}
```

### Context Switching on the Frontend

When a user logs in (or refreshes their token/fetches `/auth/me`), the backend needs to know which organization they are currently active in to load the right permissions and contextual data.

- **To switch scopes or select an organization at login:** Include the `x-organization-id` header in your API Gateway requests when fetching the user context or executing any queries.
- **Default Behavior:** If the header is omitted, the API will default to the FIRST organization the user joined.

#### Example Request:

```javascript
// Setting active org on login or across API Gateway requests
fetch('http://localhost:4000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-organization-id': 'org-id-selected-by-user', // <-- Include this to swap contexts dynamically
  },
  body: JSON.stringify({ query: '{ me { organization { id name } } }' }),
});
```

## 2. Onboarding & Invitations

The system now securely supports a 7-day token-based invitation expiry logic.

### Verifying an invitation _before_ creating the user account

The API Gateway supports a new Query `getInviteDetails(token: String!)`. This lets you read the impending role and organization associated with a pending invite link _before_ prompting them for signup logic or passwords.

```graphql
query GetInviteDetails($token: String!) {
  getInviteDetails(token: $token) {
    role
    organizationName
    email
  }
}
```

### Accepting Invitations for NEW Users

When a brand-new user accepts an invitation, they must provide their name and a password. Pass these to the `acceptInvite` mutation.

```graphql
mutation AcceptInvite($token: String!, $password: String, $name: String, $role: String) {
  acceptInvite(input: { token: $token, password: $password, name: $name, role: $role }) {
    accessToken
    user {
      id
      email
      organization {
        id
        name
      }
    }
  }
}
```

### Accepting Invitations for EXISTING Users (Cross-Organization Invite)

If an existing user receives an invitation to a _second_ organization, they don't need to specify their password or name again. The backend will detect that they're attempting to claim an invite and seamlessly map them to the new organization.

**Modification:**
The underlying `password` and `name` inputs for the accepted invite REST endpoints have been made optional, resolving the error where the backend would fail because "the user already exists".

```graphql
# Frontend can just provide the token (for an already logged-in user or recognized email address)
mutation AddExistingUserToOrg($token: String!) {
  acceptInvite(input: { token: $token }) {
    accessToken
  }
}
```

_Note:_ After calling `acceptInvite` for an existing user, wait for the access token to be returned and then simply refetch the `/me` route to see the newly expanded `user.organizations` list.

## UX Recommendations for Frontend Implementation

1. **Dashboard Header Dropdown:** Add an organization switcher directly in your global navigation using data mapped from `user.organizations`. When the user selects a new organization, update your Apollo Client / fetch middleware to attach the `x-organization-id` header.
2. **Onboarding Context:** On the `/invite/accept?token=xyz` page, initially run `getInviteDetails(token: 'xyz')`.
   - Print "You have been invited to **Vistone Digital** as a **Manager**."
   - Ask for a password if the system signals they're a new user or let them simply click "Join" if they're authenticated.
3. **Login Interception:** If a user logs in normally via `/login` and `user.organizations.length > 1`, consider dropping them onto a "Select Organization context" interstitial screen before allowing them into the main app.

## ⚠️ Breaking Change: Invalidated Old Invitations

Since we are in active development, we have **removed backward compatibility** for the old invitation flow. Previously, invitations used the raw `userId` as the token.

- Those old invitations are now universally **invalid**.
- If a user clicks an old link, the API will return a `404 Not Found` or `Invalid invitation token` error.
- The frontend should gently handle this `404` error on the `/invite/accept?token=` page by informing the user that the invitation link is invalid or has expired, and ask them to request a new invitation from their administrator.
