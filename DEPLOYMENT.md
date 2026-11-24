# Deployment

Backend on Railway (Render works the same way), frontend on Vercel, database on MongoDB Atlas.

## 1. Database

Create a free Atlas cluster and a database user, allow access from your backend host, and copy the connection string.

## 2. Backend (Railway)

1. New project, deploy from your GitHub repository, root directory `backend`.
2. Set these variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | The Atlas connection string, with a database name |
| `JWT_SECRET` | A random value (command below). The server refuses to start with a weak one. |
| `JWT_EXPIRE` | `24h` |
| `FRONTEND_URL` | Your Vercel address, without a trailing slash |
| `TRUST_PROXY` | `1`, so rate limits see each visitor's own address |
| `RATE_LIMIT_MAX` | Requests per 15 minutes per address. `1000` suits a class behind one college network. |
| `LOG_LEVEL` | `info` |

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do not set `PORT`; the host provides it. Run a single instance. Check `https://<backend>/api/health`.

## 3. Frontend (Vercel)

1. Import the repository with root directory `frontend`. Vercel detects Vite; the output folder is `dist`.
2. Set these variables, then deploy:

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://<backend>` |
| `REACT_APP_SOCKET_URL` | `https://<backend>` |
| `REACT_APP_TURN_URLS` | Optional, comma-separated, for example `turn:turn.example.com:3478` |
| `REACT_APP_TURN_USERNAME`, `REACT_APP_TURN_CREDENTIAL` | Optional. Visible to visitors, so use limited credentials. |

3. Put the final Vercel address in the backend's `FRONTEND_URL`.

These values are built in, so redeploy after changing them.

## Check it

1. Sign up, open a room, and join it from another device with the code.
2. Check video and sound both ways, then chat, a file and notes.
3. Try one device on mobile data. If only that fails, you need a TURN server.

## Problems

| Symptom | Likely cause |
|---|---|
| CORS error in the console | `FRONTEND_URL` does not exactly match the site's address |
| Backend exits at once | Missing or weak `JWT_SECRET`, or `MONGODB_URI` not reachable |
| "Too many requests" for everyone | `TRUST_PROXY` is not `1`, or `RATE_LIMIT_MAX` is too low |
| No camera prompt | The site is not on https |
| Call stays on "Connecting..." | Direct connection blocked; add a TURN server |
