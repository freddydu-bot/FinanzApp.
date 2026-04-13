# 🚀 Guía Maestra: Despliegue de Aplicaciones a la Nube
**De Modo Demo Local a App Real Multiusuario**

Esta guía documenta el proceso seguido para transformar la aplicación de Finanzas en una plataforma real compartida entre Freddy y Tatiana.

---

## 🏗️ 1. Infraestructura (El Tridente)

| Herramienta | Función | URL |
| :--- | :--- | :--- |
| **Supabase** | Base de Datos (PostgreSQL) y Auth. | [supabase.com](https://supabase.com) |
| **GitHub** | Repositorio de código y control de versiones. | [github.com](https://github.com) |
| **Netlify** | Hosting gratuito y despliegue continuo. | [netlify.com](https://netlify.com) |

---

## 🛠️ 2. Paso a Paso del Despliegue

### A. Preparación en Supabase
1. Crear un nuevo Proyecto.
2. Ejecutar el script SQL en el **SQL Editor** para crear las tablas necesarias (`profiles`, `expenses`, `budgets`, `partnerships`, `savings_goals`).
3. Obtener las llaves en **Settings > API**:
   - `Project URL`
   - `anon public` Key

### B. Preparación del Código (Frontend)
1. Instalar el cliente de Supabase: `npm install @supabase/supabase-js`.
2. Configurar el archivo de conexión (ej: `src/lib/supabase.js`).
3. Crear un archivo `.env` local para pruebas (NUNCA subirlo a GitHub):
   ```env
   VITE_SUPABASE_URL=tu_url
   VITE_SUPABASE_ANON_KEY=tu_key
   VITE_IS_DEMO_MODE=false
   ```

### C. Subida a GitHub
Si es la primera vez, ejecutar en la terminal:
```bash
git init
git add .
git commit -m "🚀 Primer lanzamiento Cloud"
# Conectar con el repo (asegúrate de que el nombre sea exacto)
git remote add origin https://github.com/usuario/nombre-repo.git
git branch -M main
git push -u origin main
```

### D. Configuración en Netlify
1. Loguearse con GitHub.
2. Seleccionar el repositorio.
3. **Variables de Env (IMPORTANTE)**: En la configuración de Netlify, añadir manualmente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_IS_DEMO_MODE` = `false`
4. Pulsar en **Deploy**.

---

## 👥 3. Lógica Multiusuario (Tips)

1. **Vinculación**: Para que dos usuarios compartan datos, el segundo usuario debe registrarse **primero**.
2. **Partnerships**: El sistema busca el correo del segundo usuario en la tabla `profiles` y crea un registro de unión que ambos comparten.
3. **Sincronización**: Al usar Supabase, cualquier cambio en un móvil se refleja instantáneamente en el otro al refrescar o mediante suscripciones en tiempo real.

---

## 🔐 4. Seguridad
- Asegúrate de que el archivo `.gitignore` incluya `.env` y `dist/`.
- No compartas tu `Project Secret` de Supabase, solo la `anon public` key.

---
*Manual generado por Antigravity para Freddy Duque - Abril 2026*
