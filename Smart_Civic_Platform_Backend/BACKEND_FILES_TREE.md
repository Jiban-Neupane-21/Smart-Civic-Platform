# Smart Civic Platform Backend File Tree

A compact view of the backend source tree rooted at `Smart_Civic_Platform_Backend/src`.

```
src/
|   app.ts
|   index.ts
|
+---config
|       constants.ts
|       env.ts
|       mailer.ts
|       supabase.ts
|       swagger.ts
|
+---middleware
|       auditlogger.ts
|       authenticate.ts
|       authorize.ts
|       forcePasswordReset.ts
|       rateLimiter.ts
|       scopeguard.ts
|       validateBody.ts
|
+---modules
|   +---auth
|   |   +---controller
|   |   |       auth.controller.ts
|   |   |
|   |   +---middleware
|   |   +---routes
|   |   |       auth.routes.ts
|   |   |
|   |   \---services
|   |           auth.service.ts
|   |
|   +---citizen
|   |   +---controller
|   |   |       citizen.controller.ts
|   |   |
|   |   +---middleware
|   |   +---routes
|   |   |       citizen.routes.ts
|   |   |
|   |   \---services
|   |           citizen.service.ts
|   |
|   +---complaints
|   |   +---controller
|   |   |       complaint.controller.ts
|   |   |
|   |   +---repository
|   |   |       complaints.repository.ts
|   |   |
|   |   +---routes
|   |   |       complaints.routes.ts
|   |   |
|   |   \---services
|   |           complaints.service.ts
|   |
|   +---department
|   |   +---controller
|   |   |       department.controller.ts
|   |   |
|   |   +---middleware
|   |   |       department.middleware.ts
|   |   |
|   |   +---repository
|   |   |       department.repository.ts
|   |   |
|   |   +---routes
|   |   |       department.route.ts
|   |   |
|   |   \---services
|   |           department.service.ts
|   |
|   +---municipality
|   |   +---controller
|   |   |       index.ts
|   |   |       municipality.controller.ts
|   |   |
|   |   +---middleware
|   |   |       municipality.middleware.ts
|   |   |
|   |   +---repository
|   |   |       municipality.repository.ts
|   |   |
|   |   +---routes
|   |   |       municipality.routes.ts
|   |   |
|   |   \---services
|   |           municipality.service.ts
|   |
|   +---notification
|   |   +---controller
|   |   |       notification.controller.ts
|   |   |
|   |   +---repository
|   |   |       notification.repository.ts
|   |   |
|   |   +---routes
|   |   |       notification.routes.ts
|   |   |
|   |   \---service
|   |           notification.service.ts
|   |
|   +---shared
|   |       legacyUser.ts
|   |       moduleMiddleware.ts
|   |
|   +---staff
|   |   +---controller
|   |   |       staff.controller.ts
|   |   |
|   |   +---middleware
|   |   |       staff.middleware.ts
|   |   |
|   |   +---repository
|   |   |       staff.repository.ts
|   |   |
|   |   +---routes
|   |   |       staff.routes.ts
|   |   |
|   |   \---services
|   |           staff.service.ts
|   |
|   \---superadmin
|       +---controller
|       |       index.ts
|       |       superadmin.controller.ts
|       |
|       +---middleware
|       |       superadmin.repository.ts
|       |
|       +---routes
|       |       superadmin.routes.ts
|       |
|       \---services
|               superadmin.services.ts
|
+---routes
|       health.routes.ts
|
+---service
|       audit.service.ts
|       email.service.ts
|       token.service.ts
|
+---types
|       database.type.ts
|
+---utils
|       auditHelper.ts
|       crypto.ts
|       error.ts
|       errors.ts
|       response.ts
|       roleHierarchy.ts
|
\---validation
        auth.validation.ts
        citizen.validation.ts
```
