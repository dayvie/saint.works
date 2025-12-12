<!-- 3ef4902b-928c-4a22-b8bc-0ed81011dadc ce77e178-bdc4-47a0-a2ec-4aead0fae8c4 -->
# Next.js TypeScript Conversion

Convert the static holding page into a Next.js App Router project with TypeScript while preserving the WebGL tiled video experience.

1. Initialize a Next.js App Router scaffold in `/Users/DEdwar05/Localhost/tiled-video`: add `package.json`, `tsconfig.json`, `next.config.mjs`, `.eslintrc.json`, `app/layout.tsx`, `app/page.tsx`, and `app/globals.css`.
2. Create `public/` and move `Speed Video 1920x1080.mp4` & `Lighted Candle Video.mp4` there; migrate `styles.css` rules into `app/globals.css`; recreate the overlay markup in JSX within `app/page.tsx`.
3. Port the WebGL background from `main.js` into a typed client component `components/VideoTiledBackground.tsx`, reusing the shader logic, resize/orientation handlers, and fallback behaviour.
4. Wire up the component in `app/page.tsx`, ensure asset references resolve, and delete the legacy static files once the new Next.js page matches functionality.

### To-dos

- [ ] (init-next) Initialize Next.js scaffold and configs
- [ ] (port-layout) Port layout/styles to App Router structure
- [ ] (webgl-react) Rewrite WebGL background as TypeScript React component
- [ ] (cleanup-legacy) Remove legacy static files
