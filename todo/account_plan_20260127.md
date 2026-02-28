# Implementation Plan: Gameserver Accounts & Authentication

**STATUS: COMPLETED**
*Note: Integrated successfully within `gameserver/lib/net` for unified websocket authentication and routing.*
## Goal
Migrate web endpoint responsibilities to the Elixir/Phoenix `gameserver`, implementing a minimal, secure user account system and token-based authentication for WebSocket connections.

## 1. Dependencies
Add the following to `src/gameserver/mix.exs`:
- `{:ecto_sql, "~> 3.10"}`: For database interaction.
- `{:postgrex, ">= 0.0.0"}`: Postgres driver.
- `{:bcrypt_elixir, "~> 3.0"}`: For secure password hashing.

## 2. Configuration (`config/`)
-   **Database**: Configure `Mutonex.Repo` in `config/runtime.exs` (create if missing or add to `config.exs`) to use environment variables (`DATABASE_URL` or `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`) provided by the `postgres` service in `compose.yaml`.
-   **Repo Module**: Generate `lib/mutonex_server/repo.ex`.
-   **Supervision**: Add `Mutonex.Repo` to the supervision tree in `lib/mutonex_server/application.ex`.

## 3. Database Schema
Create a migration and schema for the `users` table.

### Schema: `Mutonex.Accounts.User`
-   Table: `users`
-   Fields:
    -   `username`: String, unique, required.
    -   `password_hash`: String, required (hashed via Bcrypt).
    -   `society`: String, required (assigned randomly from a list of societies).
-   Timestamps: `inserted_at`, `updated_at`.

### Migration
-   `create table(:users)`
-   `add :username, :string, null: false`
-   `add :password_hash, :string, null: false`
-   `add :society, :string, null: false`
-   `create unique_index(:users, [:username])`

## 4. Core Logic (`Mutonex.Accounts`)
Implement a minimal context module `lib/mutonex_server/accounts.ex`.

-   `create_user(attrs)`:
    -   Validates changeset (length, presence).
    -   Hashes password using `Bcrypt.hash_pwd_salt/1`.
    -   Assigns random society.
    -   Inserts into Repo.
-   `get_user_by_username_and_password(username, password)`:
    -   Fetches user by username.
    -   Verifies password using `Bcrypt.verify_pass/2`.
    -   Returns `{:ok, user}` or `{:error, :unauthorized}`.

## 5. Web Interface
Refactor `Mutonex.Net.Endpoint` to use a Router instead of a monolithic Plug.

### Router (`lib/net/router.ex`)
-   Define a pipeline `:browser` (plug `:accepts, ["html"]`, `:fetch_session`, `:fetch_flash`, `:protect_from_forgery`, `:put_secure_browser_headers`).
-   Routes:
    -   `GET /`: `PageController.home` (Landing page with links to Login/Signup).
    -   `GET /signup`: `RegistrationController.new`
    -   `POST /signup`: `RegistrationController.create`
    -   `GET /login`: `SessionController.new`
    -   `POST /login`: `SessionController.create`
    -   `DELETE /logout`: `SessionController.delete`

### Controllers (`lib/net/controllers/`)
-   **RegistrationController**: Handles user creation. On success, redirects to login or auto-logs in.
-   **SessionController**:
    -   `create`: Calls `Accounts.get_user_by_username_and_password`.
    -   On success:
        -   Generates a **Phoenix Token** (salt: "user auth", data: user.id).
        -   Stores the token in the session (for HTML views) or renders it to the user.
        -   Ideally, sets a generic cookie or passes the token to the template so the JavaScript client can read it.
    -   `delete`: Clears session.

### Views/Templates
-   Use `Phoenix.Component` or minimal `.heex` templates.
-   **Signup Form**: Username, Password inputs.
-   **Login Form**: Username, Password inputs.
-   **Dashboard**: Displays "Welcome [User]" and the **Auth Token** clearly (so the user/dev can see it for debugging or the JS client can grab it).

## 6. Authentication Integration
### Web Client -> Gameserver
1.  User logs in via the HTML form.
2.  Server validates and returns the page with the `auth_token`.
3.  JavaScript reads this token.

### WebSocket Connection
Update `src/gameserver/lib/net/user_socket.ex`:
-   `connect(params, socket)`:
    -   Extract `token` from `params` (e.g., `ws://.../socket?token=XYZ`).
    -   Verify token using `Phoenix.Token.verify(socket, "user auth", token, max_age: 1209600)`.
    -   If valid:
        -   `assign(socket, :user_id, user_id)`
        -   `assign(socket, :current_user, user)`
        -   Return `{:ok, socket}`.
    -   If invalid: Return `:error`.

## 7. Security Considerations
-   **Password Storage**: Bcrypt is industry standard.
-   **Token**: `Phoenix.Token` is signed and safe for this use case.
-   **Transport**: Ensure `config/prod.exs` enforces SSL (`force_ssl: true`) when deployed.
-   **Input Validation**: Strict validation in Ecto changesets.

## 8. Development Steps
1.  Add deps and run `mix deps.get`.
2.  Set up `docker-compose` link (gameserver -> postgres) if not already explicitly clear (ensure network visibility).
3.  Run `mix ecto.gen.migration create_users`.
4.  Write Schema and Context code.
5.  Write Router and Controllers.
6.  Update `UserSocket`.
7.  Test manually via browser and `wscat` (or JS console).
