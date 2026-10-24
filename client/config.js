/* Where the game server lives.
   - Same service serves both (default Railway setup):  leave server as ''  (the page talks to its own origin).
   - Client hosted elsewhere (Netlify, GitHub Pages...): set the full URL of the Railway service, e.g.
       window.WR_CONFIG = { server: 'https://wonder-royale-production.up.railway.app' };
   You can also override it per visit with  ?server=https://...  in the page address. */
window.WR_CONFIG = { server: '' };
