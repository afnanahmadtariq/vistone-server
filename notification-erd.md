# Notification ERD

```mermaid
erDiagram
    NotificationTemplate {
        String id PK
        String name
        String content
        Json channels
        DateTime createdAt
        DateTime updatedAt
    }
    NotificationPreference {
        String id PK
        String userId
        Json preferences
        DateTime createdAt
        DateTime updatedAt
    }
    Notification {
        String id PK
        String userId
        String content
        Boolean isRead
        String type
        DateTime createdAt
    }
```
