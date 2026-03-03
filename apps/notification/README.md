# Notification Service

> **Port:** `3008` | **Framework:** Express | **DB Schema:** `notification`

---

## Overview

Manages notification delivery, templates, user preferences, and email sending (organization invites, client portal invites, team invites, and generic emails).

## Database Schema

**Prisma Schema:** `prisma/schema.prisma`

### Models

| Model                  | Table                                   | Key Fields                     |
| ---------------------- | --------------------------------------- | ------------------------------ |
| NotificationTemplate   | `notification.notification_templates`   | name, content, channels (JSON) |
| NotificationPreference | `notification.notification_preferences` | userId, preferences (JSON)     |
| Notification           | `notification.notifications`            | userId, content, isRead, type  |

## Implemented Features

### 1. Notification Templates — Full CRUD ✅

| Endpoint                             | Description     |
| ------------------------------------ | --------------- |
| `POST /notification-templates`       | Create template |
| `GET /notification-templates`        | List all        |
| `GET /notification-templates/:id`    | Get by ID       |
| `PUT /notification-templates/:id`    | Update          |
| `DELETE /notification-templates/:id` | Delete          |

### 2. Notification Preferences — Full CRUD ✅

| Endpoint                               | Description     |
| -------------------------------------- | --------------- |
| `POST /notification-preferences`       | Set preferences |
| `GET /notification-preferences`        | List all        |
| `GET /notification-preferences/:id`    | Get by ID       |
| `PUT /notification-preferences/:id`    | Update          |
| `DELETE /notification-preferences/:id` | Delete          |

### 3. Notifications — Full CRUD ✅

| Endpoint                    | Description         |
| --------------------------- | ------------------- |
| `POST /notifications`       | Create notification |
| `GET /notifications`        | List all            |
| `GET /notifications/:id`    | Get by ID           |
| `PUT /notifications/:id`    | Mark read / Update  |
| `DELETE /notifications/:id` | Delete              |

### 4. Email Sending ✅

| Endpoint                           | Description                         |
| ---------------------------------- | ----------------------------------- |
| `POST /emails/invite/organization` | Send organization member invitation |
| `POST /emails/invite/client`       | Send client portal invitation       |
| `POST /emails/invite/team`         | Send team invitation                |
| `POST /emails/send`                | Generic email sending endpoint      |

## Running

```bash
npx nx serve notification
```

## Testing

```bash
npx nx test notification
npx nx e2e notification-e2e
```
