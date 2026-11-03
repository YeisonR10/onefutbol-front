# Probar login con Google y GitHub

1. Copia `.env.example` como `.env.local` y agrega los client ID públicos:

   ```env
   VITE_GOOGLE_CLIENT_ID=...
   VITE_GITHUB_CLIENT_ID=...
   ```

2. Configura los secretos en el backend, nunca en este frontend:

   ```text
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback/google
   GITHUB_OAUTH_CLIENT_ID=...
   GITHUB_OAUTH_CLIENT_SECRET=...
   GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback/github
   ```

   El ID de cliente debe ser el mismo entre frontend y backend. En Google Cloud y GitHub registra el callback exacto mostrado arriba.

3. Inicia MySQL y el backend en `http://localhost:8181`; luego, desde esta carpeta, ejecuta `npm run dev` y abre `http://localhost:3000/login`.
4. Pulsa Google o GitHub, autoriza la cuenta y espera el regreso a OneSports. El frontend intercambia el código con el backend y guarda el JWT interno para las llamadas protegidas.

El flujo usa PKCE y el endpoint de state del backend. GitHub necesita el scope `user:email` para poder obtener un correo primario verificado. Las cuentas nuevas quedan con rol `CONSULTOR`; si el correo ya está registrado localmente, el backend exige vincular la cuenta en vez de unirlas automáticamente.
