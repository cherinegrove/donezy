# RBAC Permissions Audit

> **Goal:** Ensure all permissions are defined in the DB and properly checked in code.

---

## How permissions are checked in code

| Pattern                                         | Description                               | Example                                                           |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `hasPermission(user, resource, action, scope?)` | Core check, used in AppContext            | [rbac.ts:41](../src/lib/rbac.ts#L41)                              |
| `canAccess(user, resource, action, context)`    | Context-aware (ownerId, projectId)        | [rbac.ts:99](../src/lib/rbac.ts#L99)                              |
| `<PermissionGuard resource action scope>`       | UI gating component                       | [PermissionGuard.tsx](../src/components/auth/PermissionGuard.tsx) |
| `<RbacRoute>`                                   | Route-level access control                | [App.tsx:183](../src/App.tsx#L183)                                |
| `isRbacAdmin(user)`                             | Shortcut check = `platform_settings:edit` | [rbac.ts:209](../src/lib/rbac.ts#L209)                            |

### Scope hierarchy

```txt
own (0) < project (1) < all (2)
```

Higher scopes include lower scopes. Defined at [rbac.ts:55-70](../src/lib/rbac.ts#L55).

---

## Valid scopes by resource

| Resource          | Valid scopes            | Notes              |
| ----------------- | ----------------------- | ------------------ |
| projects          | `own`, `all`            | No `project` scope |
| tasks             | `own`, `project`, `all` |                    |
| time_entries      | `own`, `project`, `all` |                    |
| users             | `own`, `all`            |                    |
| teams             | `own`, `all`            |                    |
| clients           | `own`, `all`            |                    |
| notes             | `own`, `all`            |                    |
| messages          | `own`, `all`            |                    |
| comments          | `own`, `project`, `all` |                    |
| dashboards        | `own`, `all`            |                    |
| settings          | `own`, `all`            |                    |
| roles             | `all` only              | Admin-only         |
| permissions       | `all` only              | Admin-only         |
| statuses          | `all` only              | Admin-only         |
| custom_fields     | `all` only              | Admin-only         |
| analytics         | `all` only              |                    |
| audit_logs        | `all` only              |                    |
| billing           | `all` only              |                    |
| integrations      | `all` only              |                    |
| notifications     | `own`, `all`            |                    |
| platform_settings | `all` only              | Super-admin only   |
| templates         | `own`, `all`            |                    |

Ref: [types/rbac.ts](../src/types/rbac.ts)

---

## Permission details

### projects

| Permission         | Scope used in code        | Code checks                                                                                                                                                                                    |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects:view`    | *(route guard, no scope)* | [App.tsx:317](../src/App.tsx#L317) — RbacRoute                                                                                                                                                 |
| `projects:create`  | `own`                     | [AppContext.tsx:1695](../src/contexts/AppContext.tsx#L1695), [AppContext.tsx:3591](../src/contexts/AppContext.tsx#L3591), [Projects.tsx:276](../src/pages/Projects.tsx#L276) — PermissionGuard |
| `projects:edit`    | `own`                     | [AppContext.tsx:1760](../src/contexts/AppContext.tsx#L1760), [AppContext.tsx:3504](../src/contexts/AppContext.tsx#L3504)                                                                       |
| `projects:delete`  | `own`                     | [AppContext.tsx:1822](../src/contexts/AppContext.tsx#L1822)                                                                                                                                    |
| `projects:archive` | —                         | ❌ Defined in DB, **no check in code**                                                                                                                                                          |
| `projects:restore` | —                         | ❌ Defined in DB, **no check in code**                                                                                                                                                          |
| `projects:share`   | —                         | ❌ Defined in DB, **no check in code**                                                                                                                                                          |
| `projects:import`  | —                         | ❌ Defined in DB, **no check in code**                                                                                                                                                          |
| `projects:export`  | —                         | ❌ Defined in DB, **no check in code**                                                                                                                                                          |

---

### tasks

| Permission     | Scope used in code | Code checks                                                                                                                                                                                                                                                                                                     |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks:view`   | *(route guard)*    | [App.tsx:312](../src/App.tsx#L312) — RbacRoute, [App.tsx:317](../src/App.tsx#L317) — RbacRoute (task detail)                                                                                                                                                                                                    |
| `tasks:create` | `project`          | [AppContext.tsx:1881](../src/contexts/AppContext.tsx#L1881), [Tasks.tsx:256](../src/pages/Tasks.tsx#L256) — PermissionGuard                                                                                                                                                                                     |
| `tasks:edit`   | `project`          | [AppContext.tsx:1994](../src/contexts/AppContext.tsx#L1994), [AppContext.tsx:3787](../src/contexts/AppContext.tsx#L3787), [AppContext.tsx:3962](../src/contexts/AppContext.tsx#L3962), [AppContext.tsx:4035](../src/contexts/AppContext.tsx#L4035), [AppContext.tsx:4088](../src/contexts/AppContext.tsx#L4088) |
| `tasks:delete` | `project`          | [AppContext.tsx:2337](../src/contexts/AppContext.tsx#L2337)                                                                                                                                                                                                                                                     |
| `tasks:import` | —                  | [Tasks.tsx:256](../src/pages/Tasks.tsx#L256) — PermissionGuard (grouped with create)                                                                                                                                                                                                                            |

---

### time_entries

| Permission             | Scope used in code | Code checks                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `time_entries:view`    | *(route guard)*    | [App.tsx:324](../src/App.tsx#L324) — RbacRoute                                                                                                                                                                                                                                                                                                                                                                                                               |
| `time_entries:perform` | `own`              | [AppContext.tsx:2393](../src/contexts/AppContext.tsx#L2393), [AppContext.tsx:2496](../src/contexts/AppContext.tsx#L2496), [AppContext.tsx:2733](../src/contexts/AppContext.tsx#L2733), [AppContext.tsx:2931](../src/contexts/AppContext.tsx#L2931), [AppContext.tsx:3141](../src/contexts/AppContext.tsx#L3141), [AppContext.tsx:3179](../src/contexts/AppContext.tsx#L3179), [TimeTracking.tsx:1190](../src/pages/TimeTracking.tsx#L1190) — PermissionGuard |
| `time_entries:manage`  | *(no scope)*       | [AppContext.tsx:2651](../src/contexts/AppContext.tsx#L2651) — approve/reject                                                                                                                                                                                                                                                                                                                                                                                 |
| `time_entries:export`  | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                                                                                                                                                                                                                                                                        |

Filtering: [rbacFilters.ts:82](../src/utils/rbacFilters.ts#L82)

---

### users

| Permission     | Scope used in code | Code checks                                                                                                                                                                                                      |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users:view`   | *(tab guard)*      | ✅ [Admin.tsx](../src/pages/Admin.tsx) — PermissionGuard on Users tab                                                                                                                                            |
| `users:create` | `own`              | [AppContext.tsx:1368](../src/contexts/AppContext.tsx#L1368), [Users.tsx:139](../src/pages/Users.tsx#L139) — PermissionGuard, [AdminUsers.tsx:173](../src/components/admin/AdminUsers.tsx#L173) — PermissionGuard |
| `users:edit`   | `own`              | [AppContext.tsx:1452](../src/contexts/AppContext.tsx#L1452), [Users.tsx:205](../src/pages/Users.tsx#L205) — PermissionGuard                                                                                      |
| `users:delete` | `own`              | [AppContext.tsx:1528](../src/contexts/AppContext.tsx#L1528), [Users.tsx:215](../src/pages/Users.tsx#L215) — PermissionGuard                                                                                      |
| `users:manage` | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                            |
| `users:import` | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                            |
| `users:export` | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                            |

---

### teams

| Permission     | Scope used in code | Code checks                                                 |
| -------------- | ------------------ | ----------------------------------------------------------- |
| `teams:view`   | *(route guard)*    | [App.tsx:322](../src/App.tsx#L322) — RbacRoute              |
| `teams:create` | `own`              | [AppContext.tsx:3276](../src/contexts/AppContext.tsx#L3276) |
| `teams:edit`   | `own`              | [AppContext.tsx:3317](../src/contexts/AppContext.tsx#L3317) |
| `teams:delete` | `own`              | [AppContext.tsx:3353](../src/contexts/AppContext.tsx#L3353) |
| `teams:manage` | `own`              | ✅ [AppContext.tsx](../src/contexts/AppContext.tsx) — `updateUser()` teamIds, [Admin.tsx](../src/pages/Admin.tsx) — PermissionGuard on Teams tab |

---

### clients

| Permission       | Scope used in code | Code checks                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clients:view`   | *(route guard)*    | [App.tsx:317](../src/App.tsx#L317) — RbacRoute                                                                                                                                                                                                                                                                                                                               |
| `clients:create` | `own`              | [AppContext.tsx:1578](../src/contexts/AppContext.tsx#L1578), [Clients.tsx:121](../src/pages/Clients.tsx#L121) — PermissionGuard                                                                                                                                                                                                                                              |
| `clients:edit`   | `own`              | [AppContext.tsx:1627](../src/contexts/AppContext.tsx#L1627), [AppContext.tsx:4978](../src/contexts/AppContext.tsx#L4978), [AppContext.tsx:4987](../src/contexts/AppContext.tsx#L4987), [AppContext.tsx:4996](../src/contexts/AppContext.tsx#L4996), [AppContext.tsx:5014](../src/contexts/AppContext.tsx#L5014), [AppContext.tsx:5023](../src/contexts/AppContext.tsx#L5023) |
| `clients:delete` | `own`              | [AppContext.tsx:1665](../src/contexts/AppContext.tsx#L1665)                                                                                                                                                                                                                                                                                                                  |
| `clients:export` | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                                                                                                                                                                                        |

Filtering: [rbacFilters.ts:115](../src/utils/rbacFilters.ts#L115)

---

### notes

| Permission     | Scope used in code | Code checks                                                 |
| -------------- | ------------------ | ----------------------------------------------------------- |
| `notes:view`   | *(route guard)*    | [App.tsx:320](../src/App.tsx#L320) — RbacRoute              |
| `notes:create` | `own`              | [AppContext.tsx:3378](../src/contexts/AppContext.tsx#L3378) |
| `notes:edit`   | `own`              | [AppContext.tsx:3421](../src/contexts/AppContext.tsx#L3421) |
| `notes:delete` | `own`              | [AppContext.tsx:3456](../src/contexts/AppContext.tsx#L3456) |

---

### messages

| Permission        | Scope used in code | Code checks                                                                     |
| ----------------- | ------------------ | ------------------------------------------------------------------------------- |
| `messages:view`   | *(route guard)*    | ✅ [App.tsx](../src/App.tsx) — RbacRoute on `/messages`                          |
| `messages:create` | `own`              | [AppContext.tsx:4588](../src/contexts/AppContext.tsx#L4588)                     |
| `messages:edit`   | `own`              | [AppContext.tsx:4647](../src/contexts/AppContext.tsx#L4647) — `updateMessage()` |
| `messages:delete` | `own`              | [AppContext.tsx:4653](../src/contexts/AppContext.tsx#L4653) — `deleteMessage()` |
| `messages:send`   | —                  | ❌ Defined in DB, **no check in code**                                           |

---

### comments

| Permission        | Scope used in code | Code checks                                                 |
| ----------------- | ------------------ | ----------------------------------------------------------- |
| `comments:view`   | —                  | ❌ Defined in DB, **no check in code**                       |
| `comments:create` | `project`          | [AppContext.tsx:4430](../src/contexts/AppContext.tsx#L4430) |
| `comments:edit`   | `project`          | [AppContext.tsx:4534](../src/contexts/AppContext.tsx#L4534) |

---

### roles

| Permission     | Scope used in code | Code checks                                                 |
| -------------- | ------------------ | ----------------------------------------------------------- |
| `roles:view`   | *(tab guard)*      | ✅ [Admin.tsx](../src/pages/Admin.tsx) — PermissionGuard on Roles tab            |
| `roles:create` | *(no scope = all)* | [AppContext.tsx:4704](../src/contexts/AppContext.tsx#L4704) |
| `roles:edit`   | *(no scope = all)* | [AppContext.tsx:4750](../src/contexts/AppContext.tsx#L4750) |
| `roles:delete` | *(no scope = all)* | [AppContext.tsx:4796](../src/contexts/AppContext.tsx#L4796) |

---

### permissions

| Permission           | Scope used in code | Code checks                           |
| -------------------- | ------------------ | ------------------------------------- |
| `permissions:view`   | —                  | ❌ Defined in DB, **no check in code** |
| `permissions:create` | —                  | ❌ Defined in DB, **no check in code** |
| `permissions:edit`   | —                  | ❌ Defined in DB, **no check in code** |
| `permissions:delete` | —                  | ❌ Defined in DB, **no check in code** |

> Admin UI for permissions currently has no permission gates.

---

### templates

| Permission         | Scope used in code | Code checks                                                                                                                                                                                                                                                    |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates:view`   | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                                                                          |
| `templates:create` | `own`              | [AppContext.tsx:3505](../src/contexts/AppContext.tsx#L3505), [AppContext.tsx:4825](../src/contexts/AppContext.tsx#L4825), [Projects.tsx:287](../src/pages/Projects.tsx#L287) — PermissionGuard, [Tasks.tsx:272](../src/pages/Tasks.tsx#L272) — PermissionGuard |
| `templates:edit`   | `own`              | [AppContext.tsx:4891](../src/contexts/AppContext.tsx#L4891)                                                                                                                                                                                                    |
| `templates:delete` | `own`              | [AppContext.tsx:4934](../src/contexts/AppContext.tsx#L4934)                                                                                                                                                                                                    |
| `templates:use`    | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                                                                          |

---

### statuses

| Permission        | Scope used in code | Code checks                                                                                                                                                                                                                                        |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statuses:view`   | —                  | ❌ Defined in DB, **no check in code**                                                                                                                                                                                                              |
| `statuses:create` | *(no scope = all)* | [AppContext.tsx:4122](../src/contexts/AppContext.tsx#L4122), [AppContext.tsx:4272](../src/contexts/AppContext.tsx#L4272)                                                                                                                           |
| `statuses:edit`   | *(no scope = all)* | [AppContext.tsx:4169](../src/contexts/AppContext.tsx#L4169), [AppContext.tsx:4239](../src/contexts/AppContext.tsx#L4239), [AppContext.tsx:4319](../src/contexts/AppContext.tsx#L4319), [AppContext.tsx:4391](../src/contexts/AppContext.tsx#L4391) |
| `statuses:delete` | *(no scope = all)* | [AppContext.tsx:4208](../src/contexts/AppContext.tsx#L4208), [AppContext.tsx:4358](../src/contexts/AppContext.tsx#L4358)                                                                                                                           |

---

### custom_fields

| Permission             | Scope used in code | Code checks                                                                                                              |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `custom_fields:view`   | —                  | ❌ Defined in DB, **no check in code**                                                                                    |
| `custom_fields:create` | *(no scope = all)* | [AppContext.tsx:5040](../src/contexts/AppContext.tsx#L5040)                                                              |
| `custom_fields:edit`   | *(no scope = all)* | [AppContext.tsx:5052](../src/contexts/AppContext.tsx#L5052), [AppContext.tsx:5070](../src/contexts/AppContext.tsx#L5070) |
| `custom_fields:delete` | *(no scope = all)* | [AppContext.tsx:5061](../src/contexts/AppContext.tsx#L5061)                                                              |

---

### dashboards

| Permission          | Scope used in code | Code checks                                                                                                                                                                           |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboards:view`   | *(route guard)*    | [App.tsx:329](../src/App.tsx#L329) — RbacRoute                                                                                                                                        |
| `dashboards:create` | `own`              | [AppContext.tsx:5082](../src/contexts/AppContext.tsx#L5082), [AppContext.tsx:5152](../src/contexts/AppContext.tsx#L5152)                                                              |
| `dashboards:edit`   | `own`              | [AppContext.tsx:5100](../src/contexts/AppContext.tsx#L5100), [AppContext.tsx:5134](../src/contexts/AppContext.tsx#L5134), [AppContext.tsx:5180](../src/contexts/AppContext.tsx#L5180) |
| `dashboards:delete` | `own`              | [AppContext.tsx:5115](../src/contexts/AppContext.tsx#L5115), [AppContext.tsx:5195](../src/contexts/AppContext.tsx#L5195)                                                              |

---

### analytics

| Permission       | Scope used in code | Code checks                                                                                                                                                                                    |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analytics:view` | `all`              | [Analytics.tsx:461](../src/pages/Analytics.tsx#L461) — PermissionGuard, [Analytics.tsx:514](../src/pages/Analytics.tsx#L514) — PermissionGuard, [App.tsx:338](../src/App.tsx#L338) — RbacRoute |

---

### settings

| Permission      | Scope used in code | Code checks                                                 |
| --------------- | ------------------ | ----------------------------------------------------------- |
| `settings:view` | *(route guard)*    | [App.tsx:331](../src/App.tsx#L331) — RbacRoute              |
| `settings:edit` | `own`              | [AppContext.tsx:3491](../src/contexts/AppContext.tsx#L3491) |

---

### integrations

| Permission            | Scope used in code | Code checks                                                        |
| --------------------- | ------------------ | ------------------------------------------------------------------ |
| `integrations:view`   | —                  | ❌ Defined in DB, **no check in code**                              |
| `integrations:create` | —                  | ❌ Defined in DB, **no check in code**                              |
| `integrations:edit`   | *(no scope)*       | [Settings.tsx:12](../src/pages/Settings.tsx#L12) — PermissionGuard |

---

### notifications

| Permission           | Scope used in code | Code checks                                    |
| -------------------- | ------------------ | ---------------------------------------------- |
| `notifications:view` | *(route guard)*    | [App.tsx:328](../src/App.tsx#L328) — RbacRoute |

---

### audit_logs

| Permission          | Scope used in code | Code checks                                                  |
| ------------------- | ------------------ | ------------------------------------------------------------ |
| `audit_logs:view`   | *(route guard)*    | [App.tsx:340](../src/App.tsx#L340) — RbacRoute (`/activity`) |
| `audit_logs:export` | —                  | ❌ Defined in DB, **no check in code**                        |

---

### billing

| Permission       | Scope used in code | Code checks                           |
| ---------------- | ------------------ | ------------------------------------- |
| `billing:view`   | —                  | ❌ Defined in DB, **no check in code** |
| `billing:create` | —                  | ❌ Defined in DB, **no check in code** |
| `billing:edit`   | —                  | ❌ Defined in DB, **no check in code** |
| `billing:delete` | —                  | ❌ Defined in DB, **no check in code** |
| `billing:export` | —                  | ❌ Defined in DB, **no check in code** |

---

### platform_settings

| Permission               | Scope used in code | Code checks                                                       |
| ------------------------ | ------------------ | ----------------------------------------------------------------- |
| `platform_settings:view` | —                  | ❌ Defined in DB, **no check in code**                             |
| `platform_settings:edit` | `all`              | [rbac.ts:213](../src/lib/rbac.ts#L213) — `isRbacAdmin()` shortcut |

---

## Summary

### Still needs implementation (feature UI exists, only missing gates)

* `users:manage`, `users:import`, `users:export` — no gate in code
* `comments:view` — implicit through task view, no explicit gate

### Safe to ignore — feature not built yet

* `projects:archive`, `projects:restore`, `projects:share`, `projects:import`, `projects:export`
* `time_entries:export`
* `clients:export`
* `templates:view`, `templates:use`
* `integrations:view`, `integrations:create`
* `permissions:*`, `billing:*`, `audit_logs:export`, `platform_settings:view`
* `statuses:view`, `custom_fields:view` — admin-only, no view gate needed
* `messages:send` — handled by `messages:create` in `addMessage()`

---

## Key files

| File                                                                                                        | Purpose                                                            |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [src/lib/rbac.ts](../src/lib/rbac.ts)                                                                       | Core permission logic: `hasPermission`, `canAccess`, `isRbacAdmin` |
| [src/types/rbac.ts](../src/types/rbac.ts)                                                                   | Types, scope definitions per resource                              |
| [src/hooks/useRbac.ts](../src/hooks/useRbac.ts)                                                             | Hook `useRbac()` → `can()`, `canAccess()`, `filterByScope()`       |
| [src/components/auth/PermissionGuard.tsx](../src/components/auth/PermissionGuard.tsx)                       | UI gating component                                                |
| [src/contexts/AppContext.tsx](../src/contexts/AppContext.tsx)                                               | 80+ permission checks for mutations                                |
| [src/utils/rbacFilters.ts](../src/utils/rbacFilters.ts)                                                     | Filter data lists by user scope                                    |
| [src/utils/roleUtils.ts](../src/utils/roleUtils.ts)                                                         | Legacy role helpers (currently migrating)                          |
| [src/App.tsx](../src/App.tsx)                                                                               | Route-level RbacRoute guards                                       |
| [supabase/migrations/20260331141900_rbac_schema.sql](../supabase/migrations/20260331141900_rbac_schema.sql) | DB: tables, seed roles + permissions                               |
