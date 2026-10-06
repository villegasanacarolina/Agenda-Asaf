# Agenda en línea — Lic. Asaf Leocadio

Página donde cualquier persona ve la disponibilidad del licenciado y agenda sesiones de 30 minutos.
Todo está sincronizado con su **Google Calendar**:

- Cualquier evento que él tenga en su calendario (de cualquier duración: 15 min, 3 horas, todo el día)
  aparece en la página como **No disponible**. Las personas nunca ven qué es, solo que está ocupado.
- Cuando alguien agenda, se crea un evento en su calendario:
  - **Título del evento** = nombre de la persona
  - **Descripción** = motivo de la consulta (y el teléfono/correo si lo dejó)
- Antes de guardar, el sistema vuelve a revisar el calendario para que no se empalmen dos citas.

**No necesita base de datos**: el propio Google Calendar es la fuente de verdad, así que no hace falta MongoDB.

Tecnología: Next.js (App Router), lista para Vercel.

---

## 1. Crear las credenciales de Google (una sola vez, ~10 min)

Usaremos una **cuenta de servicio** (un "robot" de Google). Es la opción más estable:
no caduca y no requiere que el licenciado inicie sesión de nuevo.

### 1.1 Crear el proyecto y activar la API
1. Entra a <https://console.cloud.google.com/> (puede ser con la cuenta del licenciado o la tuya).
2. Arriba, en el selector de proyectos → **Proyecto nuevo** → nombre: `agenda-asaf` → **Crear**.
3. Con el proyecto seleccionado ve a **APIs y servicios → Biblioteca**.
4. Busca **Google Calendar API** → **Habilitar**.

### 1.2 Crear la cuenta de servicio y su llave
1. Ve a **IAM y administración → Cuentas de servicio** → **Crear cuenta de servicio**.
2. Nombre: `agenda-web` → **Crear y continuar** → (los roles no son necesarios) → **Listo**.
3. Haz clic en la cuenta creada → pestaña **Claves** → **Agregar clave → Crear clave nueva → JSON** → **Crear**.
4. Se descargará un archivo `.json`. **Guárdalo en un lugar seguro y no lo subas a GitHub.**
   De ese archivo necesitas dos datos:
   - `client_email` → algo como `agenda-web@agenda-asaf.iam.gserviceaccount.com`
   - `private_key` → el texto que empieza con `-----BEGIN PRIVATE KEY-----`

> Si al crear la llave aparece el aviso "La creación de claves de cuenta de servicio está inhabilitada",
> es una política de la organización de Google Workspace; un administrador debe desactivar
> `iam.disableServiceAccountKeyCreation`. Con una cuenta de Gmail normal no ocurre.

### 1.3 Compartir el calendario del licenciado con la cuenta de servicio
Esto se hace **en la cuenta de Google del licenciado**:

1. Abre <https://calendar.google.com> → ⚙️ **Configuración**.
2. En la izquierda, en **Configuración de mis calendarios**, elige su calendario (el que tiene su nombre).
3. En **Compartir con personas o grupos específicos** → **Agregar personas y grupos**.
4. Pega el `client_email` de la cuenta de servicio.
5. Permiso: **Hacer cambios en los eventos** → **Enviar**.
6. En esa misma página, baja a **Integrar el calendario** y copia el **ID del calendario**
   (para el calendario principal es su propio correo, ej. `asaf.leocadio@gmail.com`).

> Si el licenciado usa varios calendarios (por ejemplo, uno personal y uno del despacho) y quieres
> que todos bloqueen horarios, compártelos también con la cuenta de servicio
> (basta con "Ver solo información de libre/ocupado") y ponlos en `BUSY_CALENDAR_IDS`.

---

## 2. Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub (el `.gitignore` ya excluye llaves y `.env`).
2. En <https://vercel.com/new> importa el repositorio. Vercel detecta Next.js solo; no cambies nada.
3. Antes de dar **Deploy**, abre **Environment Variables** y agrega:

| Variable | Valor | ¿Obligatoria? |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | el `client_email` del JSON | Sí |
| `GOOGLE_PRIVATE_KEY` | el `private_key` del JSON, completo (ver nota) | Sí |
| `GOOGLE_CALENDAR_ID` | el ID del calendario del paso 1.3 | Sí |
| `BUSY_CALENDAR_IDS` | otros calendarios que bloquean, separados por coma | No |
| `TIMEZONE` | `America/Mexico_City` | No (es el valor por defecto) |
| `WORK_START` | hora de inicio, ej. `09:00` | No (default `09:00`) |
| `WORK_END` | hora de fin, ej. `18:00` | No (default `18:00`) |
| `WORK_DAYS` | días de atención: `0`=dom … `6`=sáb, ej. `1,2,3,4,5` | No (default lun–vie) |
| `DAYS_AHEAD` | cuántos días adelante se puede agendar | No (default `30`) |
| `MIN_NOTICE_MINUTES` | anticipación mínima en minutos | No (default `120`) |

**Nota sobre `GOOGLE_PRIVATE_KEY`:** copia el valor tal cual aparece en el JSON, incluyendo
`-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`. Funciona de cualquiera de estas formas:
con los `\n` literales como vienen en el JSON, o pegado en varias líneas. Puedes incluir o no las comillas.

4. **Deploy**. Al terminar, abre la URL y verifica que el calendario cargue.
5. Si cambias variables después, ve a **Deployments → ⋯ → Redeploy** para que tomen efecto.

### Prueba rápida
1. Agrega en el calendario del licenciado un evento de 3 horas mañana → recarga la página: esas 3 horas
   deben verse como **No disponible**.
2. Agenda una cita de prueba → debe aparecer en su Google Calendar con el nombre como título y el motivo
   en la descripción. Bórrala desde Google Calendar y el espacio vuelve a quedar libre.

---

## 3. Ajustes frecuentes

- **Hora de comida / bloquear un día:** no hace falta tocar código; basta con que el licenciado
  ponga un evento en su calendario.
- **Un evento que NO debe bloquear:** en Google Calendar, en el evento, cambia "Ocupado" por
  **"Disponible"** y dejará de bloquear la agenda.
- **Cambiar el horario:** modifica `WORK_START`, `WORK_END` o `WORK_DAYS` en Vercel y haz Redeploy.
- **Textos de la página:** están en `app/page.js`. **Colores:** al inicio de `app/globals.css`.

## 4. Desarrollo local (opcional)

```bash
npm install
cp .env.example .env.local   # llena tus credenciales
npm run dev                  # http://localhost:3000
```

Para ver el diseño sin conectar Google, pon `DEMO_MODE=true` en `.env.local`: muestra horarios ocupados
de ejemplo y las citas se guardan solo en memoria. **Nunca lo actives en Vercel.**

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| "No pudimos consultar la agenda" | Falta alguna variable, la llave está incompleta o el calendario no está compartido con la cuenta de servicio. Revisa **Vercel → Logs**: el mensaje dice exactamente qué calendario falló. |
| Carga la agenda pero falla al agendar | El calendario se compartió con "Ver" en lugar de **"Hacer cambios en los eventos"**. |
| Error `invalid_grant` / `DECODER routines` en logs | `GOOGLE_PRIVATE_KEY` mal copiada. Pégala de nuevo completa. |
| Las horas salen corridas | Revisa `TIMEZONE` y la zona horaria del calendario en Google. |
