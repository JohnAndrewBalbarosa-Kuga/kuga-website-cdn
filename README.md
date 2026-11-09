# kuga-website-cdn

Runtime files for the Kuga Energy website homepage (3D scroll story), served to Webflow through jsDelivr:

```
https://cdn.jsdelivr.net/gh/JohnAndrewBalbarosa-Kuga/kuga-website-cdn@<tag>/src/main.js
https://cdn.jsdelivr.net/gh/JohnAndrewBalbarosa-Kuga/kuga-website-cdn@<tag>/styles/main.css
```

Do not edit here. The source lives in the private `kuga-website` project; `web/publish_cdn.py` copies
`src/`, `styles/`, `models/` and `assets/awards/` into this repo. Each release is a git tag, and Webflow
pins a tag, so a change goes live only when the Webflow script URL is moved to the new tag.

© Kuga Energy. All rights reserved.
