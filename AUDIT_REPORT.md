# Story Spark AI Local Audit Report

Audit target: `http://localhost:4001`  
Backend observed: `http://localhost:5000/api/v1`  
Date: 2026-05-31

## Scope And Method

The in-app browser backend was unavailable during this session (`iab` browser list was empty), and local Chrome headless exited immediately before producing screenshots. I therefore used:

- live HTTP probes against `localhost:4001` and `localhost:5000/api/v1`
- frontend route/source inspection
- backend router/controller/model inspection
- frontend API slice inspection

Screenshots could not be captured from this environment. The report still maps all declared routes, visible navigation, API contracts, auth behavior, data model, and the Story Visualizer integration plan.

## A. Complete Sitemap

### Public Root Layout Routes

All are served by the SPA at HTTP 200 from `localhost:4001`; protected behavior is enforced client-side after React loads.

| Route | Component | Access | Notes |
|---|---|---:|---|
| `/` | `HeroSectionComponent` + `HomeComponent` | Public | Homepage with hero, latest/featured content, reviews, pricing, resources |
| `/templates` | `TemplatesComponent` | Public | Writing templates |
| `/writing-assistant` | `WritingAssistantComponent` | Public | Writing helper UI |
| `/story-inspiration` | `StoryInspirationWrapper` | Public | Inspiration prompts/cards |
| `/stories` | `StoriesComponent` | Public | Main AI generation workflow; guest quota available |
| `/story-workspace` | `StoryWorkspace` | Public route, requires Redux state | Shows `No Story Available` without `story.currentStory` |
| `/login` | `LoginComponent` | Public | Header/footer hidden |
| `/signup` | `SignUpComponent` | Public | Header/footer hidden |
| `/pricing` | `PricingComponent` | Public | Subscription/paywall UI |
| `/post/:id` | `PostDetailsComponent` | Public | Story detail, comments/reactions/bookmarks |
| `/help` | `HelpCenterComponent` | Public | Alias of help center |
| `/help-center` | `HelpCenterComponent` | Public | Primary help route |
| `/contact-us` | `Contact` | Public | Contact form |
| `/about-us` | Footer page | Public | Static/about |
| `/career` | Footer page | Public | Static/careers |
| `/blog` | Footer page | Public | Static/blog |
| `/privacy-policy` | Footer page | Public | Legal |
| `/cookie-policy` | Footer page | Public | Legal |
| `/terms` | Footer page | Public | Legal |
| `/guidelines` | Footer page | Public | Community guidelines |
| `/contributors` | Footer page | Public | Contributors |
| `/report-bug` | `ReportBug` | Public | Bug report form |
| `*` | `NotFoundComponent` | Public | SPA 404 view |

### Protected Root Layout Routes

These redirect to `/login` if `accessToken` is absent/invalid.

| Route | Component | Roles |
|---|---|---|
| `/explore` | `ExploreComponent` | user, writer, admin, super_admin |
| `/bookmarks` | `BookmarksComponent` | user, writer, admin, super_admin |
| `/community` | `CommunityComponent` | user, writer, admin, super_admin |
| `/resources` | `ResourcesListComponent` | user, writer, admin, super_admin |
| `/resources/:resourceName` | `ResourceDetailComponent` | user, writer, admin, super_admin |

### Standalone Routes

| Route | Component | Access | Notes |
|---|---|---:|---|
| `/auth/email-validation` | `EmailValidationComponent` | Public | Email validation screen |
| `/payment` | `PaymentComponent` | Public route | Backend payment endpoints require user auth |
| `/collab` | `CollabHome` | Public | Collaboration landing / room entry |
| `/collab/:roomId` | `CollabRoom` | Public | Socket-based collaboration room |

### Dashboard Routes

All under `/dashboard` require auth. Nested routes also enforce roles.

| Route | Component | Roles |
|---|---|---|
| `/dashboard` | `DashboardComponent` | all authenticated roles |
| `/dashboard/profile` | `ProfileComponent` | all authenticated roles |
| `/dashboard/writers` | `WriterApplicationComponent` | all authenticated roles in router; API actions role-restricted |
| `/dashboard/users` | `UserComponent` | all authenticated roles in router; API requires admin/super_admin |
| `/dashboard/settings` | `SettingComponent` | user, writer |
| `/dashboard/analytics` | `AnalyticsPage` | writer |
| `/dashboard/post-lists` | `PostListsComponent` | writer, admin, super_admin |

### Broken Or Suspicious Navigation Targets

| Target | Source | Problem |
|---|---|---|
| `/analytics` | Desktop/mobile nav | No frontend route declared; should probably be `/dashboard/analytics` or a public analytics route should be added |
| `/forgot-password` | Login form link | `ForgotPasswordComponent` exists but no route is registered |
| `/community` footer/nav | Protected route | Guest users are sent to login, but footer presents it as public |
| `/resources` | Protected route | Not visible in desktop nav except footer/community flows; should be clarified |
| Help button in desktop nav | `NavList` | Calls `navigate("/help-center")`, but `navigate` is not imported/defined, causing a click-time `ReferenceError` |

## B. Page-By-Page Breakdown

### Home `/`

Purpose: product landing and content discovery.  
Primary features: hero CTA, latest posts, featured stories, writer feedback/reviews, recommendations, community spotlight, trending topics, pricing preview, resources.  
Inputs: newsletter email in footer; review form if enabled; navigation actions.  
Outputs: content lists, CTA navigation.  
APIs likely used: `GET /post/latest-lists`, `GET /post/feature-lists`, `GET /review/lists`, `GET /recommendations/personalized` when logged in.  
Auth: public.

### Stories `/stories`

Purpose: generate AI stories from prompts.  
Inputs: prompt, genre, length, language, example prompt selection, recent prompt selection.  
Outputs: generated story cards, publish action, alternate endings/remix/translate workflows, audio by genre.  
APIs:

- Guest: `POST /ai_model/generate-free-model`
- Authenticated: `POST /ai_model/generate-model`
- Profile usage counter: `GET /user/profile`

Auth: public with guest quota; authenticated unlocks monthly quota.  
Important defaults: a placeholder/test story is seeded in state on initial load, so the page can show story output even before generation.

### Story Workspace `/story-workspace`

Purpose: chapter-based workspace for a selected story.  
Inputs: Redux `story.currentStory`, continue button.  
Outputs: chapter sidebar, chapter reader, continuation action.  
APIs: likely `POST /story-continuation/continue`; `GET /story/:storyId/versions`; `POST /story/version/:versionId/restore`.  
Auth: route is public, but useful only after state exists.  
Issue: direct navigation shows only `No Story Available`; no recovery from URL/id.

### Explore `/explore`

Purpose: browse published posts/stories.  
Inputs: pagination, filters/search if present.  
Outputs: story cards/list.  
APIs: `GET /post/lists`, `GET /post/feature-lists`, `POST /reaction/toggle`, bookmark endpoints.  
Auth: protected by frontend.

### Post Detail `/post/:id`

Purpose: read a story/post and interact with it.  
Inputs: comment text, reaction, bookmark, follow author.  
Outputs: story body, comments, related stories.  
APIs: `GET /post/:id`, `GET /comment/get-comments/:postId`, `POST /comment/create`, `PATCH /comment/toggle-like/commentId=:commentId`, `POST /reaction/toggle`, `GET /post/tag/:tag`, bookmark status/toggle.  
Auth: public read; write actions require auth.

### Auth Pages `/login`, `/signup`

Login inputs: email, password, Google credential.  
Login outputs: access token stored in `localStorage.accessToken`, redirect to `/dashboard` for admin/super_admin and `/explore` for other roles.  
Signup inputs: name, email, password, confirm password, OTP.  
Signup outputs: OTP email, verification token, registration access token.  
APIs: `POST /auth/login`, `POST /auth/google-login`, `POST /otp_validation/verify-email`, `POST /otp_validation/verify-otp`, `POST /auth/register`.

### Dashboard

Purpose: user/admin/writer operations.  
Inputs: profile edit form, writer application form, admin approval controls, post management controls.  
Outputs: charts, users, writer applications, post lists, settings.  
APIs: `GET /analysis/dashboard`, `GET /user/profile`, `PATCH /user/update`, `GET /user/lists`, `POST /writer-applications`, `GET /writer-applications`, `PATCH /writer-applications/:id`, `GET /analytics/*`.

### Collaboration `/collab`, `/collab/:roomId`

Purpose: collaborative writing room.  
Inputs: room id, editor text/actions.  
Outputs: shared room state via socket.  
APIs/dependencies: `socket.io-client`, `VITE_SOCKET_URL`; backend socket modules `collab.socket.ts`, `notification.socket.ts`.  
Auth: route currently public.

## C. Feature Inventory

| Feature | Purpose | Inputs | Outputs | Dependencies | Auth |
|---|---|---|---|---|---|
| AI story generation | Create stories from prompt | prompt, genre, length, language | story array | RTK Query, AI backend, quota middleware | guest or auth |
| Recent prompts | Reuse prompt history | generated prompt | local panel entries | localStorage hook | public |
| Draft autosave | Preserve story draft | prompt/genre/length/language/stories | `story_spark_draft` | localStorage | public |
| Genre soundtrack | Audio ambience | genre click | looping audio | `/public/audio/*.mp3` | public |
| Story publish | Save generated story | story fields | Post | `POST /post/create` | auth |
| Alternate endings | Generate variations | title/content/tag/language | alternate story output | AI endpoints | guest or auth |
| Remix | Transform story | remix type/option | remixed story | AI endpoints | guest or auth |
| Translation | Translate story | story + target language | translated content | AI endpoints | guest or auth |
| Bookmarks | Save stories | story id | bookmark status/list | Bookmark model/API | auth |
| Reactions | Like/love/etc. | postId/type | reaction state | Reaction model/API | auth |
| Comments | Discuss posts | postId/comment | nested comments/likes | Comment model/API | create/like auth |
| Dashboard analytics | Writer/admin metrics | auth token | charts/cards | Chart.js/Recharts/backend analytics | auth/role |
| Notifications | User alerts | read action | unread/read notifications | notification hook/socket/API | auth |
| Contact | Contact submission | name/email/message | stored contact | contact API | public |
| Bug report | Collect defects | title/category/severity/steps | bug report | bug report API | public |
| Newsletter | Subscribe users | email | subscriber record | direct `fetch` to newsletter endpoint | public |
| Writer application | Request writer role | portfolio/reason | application | writer application API | user |
| Collaboration room | Real-time writing | room/editor events | shared room | Socket.IO | public route |

## D. API Inventory

Base URL: `VITE_BASE_URL`, expected `http://localhost:5000/api/v1`.

Live probes:

- `GET /post/latest-lists` -> 200, `{ success:true, data:[] }`
- `GET /post/feature-lists` -> 200, `{ success:true, data:[] }`
- `GET /post/lists` -> 200, paginated empty data
- `GET /review/lists` -> 200, empty data
- `GET /analytics/overview` -> 200, zeroed metrics
- `GET /analytics/heatmap|genres|wordcloud` -> 200, empty data
- `GET /user/profile`, `/notifications`, `/bookmarks`, `/analysis/dashboard` -> 401 unauthenticated

### Auth

| Method | URL | Payload | Success | Errors/Auth |
|---|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ accessToken }` | rate limited, validation errors |
| POST | `/auth/google-login` | `{ token }` | `{ accessToken }` | rate limited |
| POST | `/auth/register` | `{ name,email,password,verificationToken }` | `{ accessToken }` | IP rate limited, validation |
| POST | `/auth/refresh-token` | refresh cookie/body inferred | new token | public endpoint |
| POST | `/auth/forgot-password` | `{ email }` | reset initiation | rate limited |
| POST | `/auth/reset-password` | reset token/password payload | reset success | rate limited |

### OTP

| Method | URL | Payload | Success | Errors/Auth |
|---|---|---|---|---|
| POST | `/otp_validation/verify-email` | `{ name,email }` | `{ expiresAt }` | OTP rate/email config failures |
| POST | `/otp_validation/verify-otp` | `{ email, otp }` | `{ verificationToken }` | invalid/expired OTP |

### AI Model

| Method | URL | Payload | Success | Auth/Quota |
|---|---|---|---|---|
| POST | `/ai_model/generate-model` | `{ prompt, wordLength, language }` | `{ success, message, data: Story[] }` | bearer auth, monthly quota |
| POST | `/ai_model/generate-free-model` | same | generated story | guest cookie quota + IP rate limit |
| POST | `/ai_model/generate-alternate-endings` | `{ title, content, tag, language }` | alternates | bearer auth, monthly quota |
| POST | `/ai_model/generate-free-alternate-endings` | same | alternates | guest cookie quota + IP rate limit |
| POST | `/ai_model/remix` | `{ title, content, tag, remixType, remixOption }` | `{ title, content, tag }` | quota middleware and token lookup |
| POST | `/ai_model/remix-free` | same | remixed story | free rate limit |
| POST | `/ai_model/translate` | translate payload | translated story | quota middleware and token lookup |
| POST | `/ai_model/translate-free` | translate payload | translated story | free rate limit |

### Content And Community

| Method | URL | Auth | Purpose |
|---|---|---:|---|
| POST | `/post/create` | user/writer/admin/super_admin | Create published story |
| GET | `/post/lists` | public | Paginated posts |
| GET | `/post/latest-lists` | public | Latest posts |
| GET | `/post/feature-lists` | public | Featured posts |
| GET | `/post/tag/:tag` | public | Related posts by tag |
| GET | `/post/:id` | public | Single post |
| POST | `/post/:postId` | admin/super_admin | Feature post toggle |
| POST | `/post/:id/bookmark` | auth | Legacy post bookmark toggle |
| PATCH | `/post/:id` | auth | Update post |
| DELETE | `/post/:id` | auth | Soft delete post |
| POST | `/comment/create` | auth | Create comment |
| GET | `/comment/get-comments/:postId` | public | Fetch comments |
| PATCH | `/comment/toggle-like/commentId=:commentId` | auth | Like comment |
| POST | `/reaction/toggle` | auth | Toggle post reaction |
| POST | `/bookmarks/:storyId` | auth | Toggle bookmark |
| GET | `/bookmarks` | auth | Bookmark list |
| GET | `/bookmarks/status/:storyId` | auth | Bookmark status |
| DELETE | `/bookmarks/:storyId` | auth | Delete bookmark |

### Dashboard, Analytics, Admin

| Method | URL | Auth | Purpose |
|---|---|---:|---|
| GET | `/analysis/dashboard` | any auth role | Dashboard summary |
| GET | `/analytics/overview` | public | Analytics overview |
| GET | `/analytics/heatmap` | public | Activity heatmap |
| GET | `/analytics/genres` | public | Genre distribution |
| GET | `/analytics/wordcloud` | public | Word cloud |
| GET | `/analytics/productive-hours` | auth | Productive hours |
| GET | `/analytics/emotion-distribution` | auth | Emotion distribution |
| GET | `/analytics/mood-timeline` | auth | Mood timeline |
| GET | `/user/lists` | admin/super_admin | User list |
| GET | `/user/profile` | intended auth | Current user profile; live probe returns 401 without token |
| GET | `/user/:id` | auth | User detail |
| PATCH | `/user/update` | auth | Profile update |
| DELETE | `/user/:id` | admin/super_admin | Delete user |
| POST | `/user/apply-for-writer` | user | Apply for writer |
| POST | `/user/approve-writer-application` | admin/super_admin | Approve writer |
| POST | `/user/follow/:authorId` | auth | Follow/unfollow |
| GET | `/user/follow-status/:authorId` | auth | Follow state |
| POST | `/writer-applications` | user | Submit application |
| GET | `/writer-applications` | admin/super_admin | List applications |
| PATCH | `/writer-applications/:id` | admin/super_admin | Approve/reject |

### Other

| Method | URL | Auth | Purpose |
|---|---|---:|---|
| GET | `/notifications` | auth | Notifications |
| PATCH | `/notifications/:id/read` | auth | Mark read |
| GET | `/review/lists` | public | Published reviews |
| GET | `/review/pending` | admin/super_admin | Pending reviews |
| POST | `/review/create` | auth | Create review |
| PATCH | `/review/:id` | admin/super_admin | Approve review |
| POST | `/newsletter/subscribe` | public | Newsletter subscribe |
| GET | `/newsletter/verify/:token` | public | Verify newsletter |
| POST | `/newsletter/unsubscribe` | public | Unsubscribe |
| POST | `/newsletter/unsubscribe-token` | public | Generate unsubscribe token |
| GET | `/newsletter/unsubscribe/:token` | public | Token unsubscribe |
| POST | `/payment/create-order` | user | Razorpay order |
| POST | `/payment/verify` | user | Razorpay signature verification |
| POST | `/stories/branching` | auth | Branching story choice generation |
| POST | `/story-continuation/continue` | public | Stub continuation text |
| GET | `/story/:storyId/versions` | auth inferred | Story versions |
| GET/POST | `/story/version/:versionId/restore` | auth inferred | Restore story version |
| POST | `/contact` | public | Contact form |
| POST | `/bug-reports/submit` | public | Bug report |
| GET | `/recommendations/personalized` | likely auth | Personalized recommendations |

## E. Authentication Flow

Guest:

- Can access public routes and `/stories`.
- Guest story generation posts to `/ai_model/generate-free-model`.
- Frontend also tracks `guestRequestCount` in localStorage and blocks after 3 generations.
- Backend additionally stores `GuestUsage` by cookie `userId` with limit 3, and has IP limiter of 5 free AI requests per 24 hours. These two limits are inconsistent.

Registration:

1. User enters name/email/password/confirm password.
2. Frontend validates password complexity.
3. `POST /otp_validation/verify-email`.
4. OTP field appears; user enters 6-digit OTP.
5. `POST /otp_validation/verify-otp`.
6. `POST /auth/register` with `verificationToken`.
7. Access token saved in `localStorage.accessToken`.
8. Navigate to `/`.

Login:

1. `POST /auth/login` with email/password.
2. Access token saved.
3. Token decoded client-side to determine role.
4. Admin/super_admin redirect to `/dashboard`; other users redirect to `/explore`.

Google OAuth:

1. `@react-oauth/google` returns credential.
2. `POST /auth/google-login` with `{ token: credential }`.
3. Access token saved; same role redirect.

Logout:

- Desktop header clears all `localStorage` and redirects to `/login`.
- Floating mobile nav calls `removeUserInfo()` and navigates to `/`.
- Behavior is inconsistent.

Protected routes:

- Frontend `ProtectedRoute` checks decoded `localStorage.accessToken`.
- Missing token redirects to `/login`.
- Wrong role redirects to `/`.

## F. Database Model Inference

Entities and relationships:

- `User`
  - has many `Post` via `posts`
  - has many followers/following as self-references
  - has gamification, reading preferences/history
  - has subscription tier and request counters
- `Post` / Story
  - belongs to `User` as author
  - has many `Comment`, `Reaction`, bookmarks
  - stores title, content, tag, image, language, genre, emotions, topics, counters
- `Comment`
  - belongs to `Post` and `User`
  - self-references parent comment for replies
  - has many user likes
- `Reaction`
  - belongs to `Post` and `User`
  - unique by post/user/type
- `Bookmark`
  - joins `User` and `Post`
  - unique by user/story
- `Review`
  - optional `userId`, public feedback fields, publish workflow
- `Notification`
  - belongs to `User`
  - type/title/body/read state
- `StoryVersion`
  - belongs to `Post`
  - created by `User`
  - versionNumber unique per story
- `WriterApplication`
  - belongs to applicant `User`
  - optional reviewedBy `User`
- `GuestUsage`
  - guest quota by cookie id
- `OTP`
  - email OTP and verification token with TTL
- `NewsletterSubscriber`
  - email subscriber, optional user link
- `BugReport`
  - standalone report with severity/status
- Collaboration Room
  - no persisted model found; likely socket-only state unless hidden elsewhere
- Analytics Event
  - no event model found; analytics inferred from `Post`/user activity fields
- Subscription
  - no separate subscription model found; user has `subscriptionType`; Razorpay payment endpoints update user/subscription state

## G. Error Report

| Severity | Issue | Reproduction | Probable Cause | Suggested Fix |
|---|---|---|---|---|
| High | Desktop Help button crashes on click | Click question-mark button in header | `navigate` is referenced in `NavList` but `useNavigate` is not imported/called | Add `const navigate = useNavigate()` and import it, or use `<Link>` |
| High | `/analytics` nav route is broken | Click Analytics in header/floating nav as guest | Route is not declared in `App.tsx`; dashboard analytics is `/dashboard/analytics` and writer-only | Add public `/analytics` route or point nav to correct protected route |
| High | `/forgot-password` link is broken | Click Forgot Password on login | Component exists but route missing | Add route `{ path: "forgot-password", element: <ForgotPasswordComponent /> }` |
| Medium | Protected community/resources shown as public navigation | Guest clicks Community/footer resources | Routes redirect to login | Either make pages public or label/guard nav as auth-required |
| Medium | Auth state is inconsistent across header implementations | Logout desktop vs mobile | Desktop clears all localStorage; mobile only removes auth key | Centralize logout through auth service/context |
| Medium | Guest quota mismatch | Generate as guest | Frontend blocks at 3; backend IP limiter allows 5 but guest DB quota blocks 3 | Align frontend copy, DB quota, and rate limiter |
| Medium | Story workspace cannot restore direct-link state | Navigate directly to `/story-workspace` | Workspace only reads Redux state | Route by story id and fetch story/versions |
| Medium | `user/profile` router lacks explicit `auth(...)` middleware | Probe returns 401 likely from controller/token helper, but router does not declare auth | Auth enforcement hidden in controller, inconsistent | Add auth middleware at router level |
| Medium | Mojibake/encoding artifacts in UI strings | Inspect generated story page source | Emoji/localized strings appear corrupted in file | Save files as UTF-8 and replace corrupted strings |
| Low | `comment.api.ts` uses `/get-comments/postId=${postId}` | Frontend URL differs from backend `/get-comments/:postId` but may match literal param route accidentally | Confusing pseudo-param path | Change frontend to `/comment/get-comments/${postId}` |
| Low | `story-continuation/continue` is a stub | Continue story | Returns fixed placeholder text | Wire to AI service and story version creation |
| Low | `NavList` notification data is hardcoded empty | Click notification bell | Hook is not used in desktop header | Replace placeholders with `useNotifications()` |

## H. UX Improvement Opportunities

- Make navigation truthful: hide protected links for guests or show a login-required state.
- Replace `/analytics` with a valid route; otherwise the primary nav has a dead item.
- Add an actual forgot-password route because the login UI already advertises it.
- Unify desktop and mobile navigation. There are two nav systems with different auth/logout behavior and different item sets.
- Add empty-state recovery to `/story-workspace`: load by URL, import a draft, or navigate to `/stories`.
- Avoid showing a seeded test story as real generated output on `/stories`.
- Surface quota state from the backend instead of relying on localStorage.
- Repair encoding so language and emoji labels display correctly.
- Add loading/error states to public content blocks when the API returns empty lists.
- Make Story generation controls denser and clearer on mobile; the recent prompts button sits inside the textarea area and can compete with text.

## I. Story Visualizer Integration Plan

Best location:

- Primary: inside `/story-workspace`, next to `StoryViewer`.
- Secondary: as an action on generated story cards in `/stories` and story detail `/post/:id`.

Recommended UI placement:

- Add a `Visualizer` tab/panel in `StoryWorkspace`.
- Desktop: split layout with chapter sidebar left, story/visualizer center, inspector right.
- Mobile: tab switcher: `Read`, `Map`, `Characters`, `Timeline`.
- Add per-story actions: `Open Visualizer`, `Generate Map`, `Extract Characters`, `Timeline`.

Backend architecture:

- Add a `story_visualization` module.
- Store derived visualization data rather than regenerating on every page load.
- Generate from story title/content/chapter text using an AI extraction service.
- Version visualization records by `storyId`, `sourceVersionId`, and `schemaVersion`.

Suggested entities:

- `StoryVisualization`
  - `storyId`, `storyVersionId`, `createdBy`
  - `characters[]`: name, aliases, role, traits, relationships
  - `locations[]`: name, type, description, coordinates or graph position
  - `events[]`: chapterId, sequence, summary, involvedCharacters, location
  - `relationships[]`: fromCharacter, toCharacter, relation, sentiment
  - `worldMap`: nodes/edges/layout
  - `status`: pending/ready/failed

API design:

- `POST /story-visualizations`
  - payload: `{ storyId, storyVersionId?, mode: "full"|"characters"|"timeline"|"map" }`
  - returns job/visualization id
- `GET /story-visualizations/:storyId`
  - returns latest visualization
- `POST /story-visualizations/:id/regenerate`
  - regenerates selected sections
- `PATCH /story-visualizations/:id`
  - lets user edit extracted nodes/relationships
- `GET /story-visualizations/:id/export`
  - JSON/SVG/PNG export

Reusable frontend components:

- `StoryWorkspace`, `ChapterSidebar`, `StoryViewer`
- `StoryWorldMap` already exists under `frontend/src/components/story-map/StoryWorldMap.tsx`
- analytics chart components for timeline/relationship visualizations
- `StoryTimeline` and `StorySegment` under `components/stories`
- existing modal/card/button styles and `ThemeToggle`

Component structure:

- `components/story-visualizer/StoryVisualizerPanel.tsx`
- `components/story-visualizer/CharacterGraph.tsx`
- `components/story-visualizer/TimelineView.tsx`
- `components/story-visualizer/LocationMap.tsx`
- `components/story-visualizer/VisualizerInspector.tsx`
- `redux/apis/storyVisualization.api.ts`

Implementation sequence:

1. Fix workspace routing to `/story-workspace/:storyId` or `/stories/:id/workspace`.
2. Add visualization API/model with cached extraction.
3. Integrate `StoryWorldMap` as first tab.
4. Add character and event extraction.
5. Add editing/export.

## J. Screenshot Inventory

Requested screenshots could not be captured because:

- the Codex in-app browser returned no available browser instances
- Chrome headless on this machine exited immediately and produced no screenshot file

Required screenshots for the next visual pass:

- Home desktop and mobile
- Stories initial state, language dropdown, prompt dropdown, recent prompts panel, loading animation, quota modal, generated story cards
- Login, signup, OTP state, Google OAuth area
- Explore list and post detail
- Dashboard overview, profile, settings, users, writers, post-lists, analytics
- Collab home and room
- Footer/legal/static pages
- Error/404 route

