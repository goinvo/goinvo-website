# Sanity CMS Guide — GoInvo Website

A practical guide for editing content in the GoInvo website CMS.

---

## 1. Getting Started

### Studio URL

The Sanity Studio is embedded in the site at:

- **Local**: `http://localhost:3000/studio`
- **Production**: `https://goinvo.com/studio`

### Logging In

Sign in with your Sanity account (Google or GitHub). Ask a team admin to invite you if you don't have access.

### Roles

| Role       | Can do                                      |
| ---------- | ------------------------------------------- |
| **Admin**  | Everything, including managing team members  |
| **Editor** | Create, edit, publish, and delete content    |
| **Viewer** | Read-only access to the Studio               |

---

## 2. Content Types

| Type                | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| **Case Study**      | Client project write-ups shown on `/work`        |
| **Feature**         | Vision pieces, open-source projects, thought leadership |
| **Vision Project**  | Internal/experimental vision projects             |
| **Category**        | Tags for filtering case studies                   |
| **Team Member**     | Staff and alumni bios on `/about`                 |
| **Job**             | Open positions on `/about/careers`                |
| **Homepage Header** | Rotating hero slides on the homepage              |
| **Page**            | Generic content pages                             |
| **Site Settings**   | Global config: title, social links, footer, contact info |

---

## 3. Editing Case Studies

1. In the Studio sidebar, click **Case Study** → **+ Create**.
2. Fill in the required fields:
   - **Title** — the headline (e.g. "Inspired EHRs")
   - **Slug** — click **Generate** to auto-create from the title
3. Add a **Hero Image** (recommended 1600 × 900 px).
4. Write a short **Caption** (1–2 sentences) for the listing card.
5. Tag with one or more **Categories**.
6. Author the **Content** using the rich text editor (see Section 7).
7. Optionally add **Results** (stat + description pairs) and **References**.
8. Pick 2–3 **Up Next** case studies to suggest at the bottom.
9. Set a **Sort Order** number — lower numbers appear first on `/work`.
10. Fill in the **Meta Description** for SEO (~160 characters).
11. Click **Publish**.

### Hiding a Case Study

Check the **Hidden** toggle to remove from the `/work` listing while keeping the page accessible by direct URL.

---

## 4. Managing Team Members

1. Click **Team Member** → **+ Create**.
2. Enter **Name** and **Role** (e.g. "Creative Director").
3. Upload a square **Photo** (at least 400 × 400 px). Use the hotspot tool to set the crop focus.
4. Write a short **Bio** using the rich text editor.
5. Add **Social Links** (LinkedIn, Twitter, Medium, Website, Email).
6. Set a **Sort Order** number to control display position.
7. Click **Publish**.

### Alumni

Check the **Is Alumni** toggle to move someone to the Alumni section. Don't delete their record — this preserves their profile for legacy links.

---

## 5. Vision & Features

### Features (Vision Pieces)

Features represent GoInvo's vision work — thought leadership, open-source projects, and design explorations.

1. Click **Feature** → **+ Create**.
2. Fill in **Title**, **Slug**, **Image**, and **Description**.
3. Choose one or more **Categories** (Healthcare, AI, Open Source, etc.).
4. Set a **Date** for display (e.g. "Feb.2026").
5. Optionally add:
   - **Video URL** for a hero video
   - **External Link** if the card should link to an outside URL instead of a detail page
   - **Content** for a full internal detail page
6. Set **Order** for display position.
7. Click **Publish**.

### Vision Projects

Similar to Features but for internal/experimental projects. Same workflow: Title, Slug, Image, Description, Content, Category.

---

## 6. Homepage Headers

The homepage hero is a carousel. Each slide is a **Homepage Header** document.

1. Click **Homepage Header** → **+ Create**.
2. Enter a **Title** and optional **Subtitle**.
3. Upload an **Image** (recommended 1920 × 800 px).
4. Set the **Link** — where clicking the hero navigates to (e.g. `/work/hgraph`).
5. Set **Sort Order** to control carousel position (lower = first).
6. Click **Publish**.

To remove a slide, unpublish or delete the document.

---

## 7. Rich Text Editor

The rich text editor (Portable Text) supports:

### Text Styles

- **Normal** — body paragraph
- **H2, H3, H4** — section headings (use H2 for main sections, H3 for sub-sections)
- **Quote** — block quote styling

### Formatting

- **Bold**, _Italic_, Underline via the toolbar
- **Links** — select text, click the link icon, enter a URL. Check "Open in new tab" for external links.

### Special Blocks

Click the **+ Insert** button to add:

| Block          | What it does                                                |
| -------------- | ----------------------------------------------------------- |
| **Image**      | Inline image with alt text, caption, and size control       |
| **Columns**    | 2- or 3-column layout with text and images                  |
| **Quote**      | Styled quote with author name and role                      |
| **Results**    | Stats banner (number + description pairs)                   |
| **References** | Numbered source links                                       |
| **Video Embed**| Embedded video with optional poster image and caption       |
| **Divider**    | Horizontal rule (default or thick)                          |

---

## 8. Image Guidelines

| Content Type       | Recommended Size     | Notes                          |
| ------------------ | -------------------- | ------------------------------ |
| Case Study hero    | 1600 × 900 px       | Landscape, high quality         |
| Feature/Vision     | 1600 × 900 px       | Same as case studies            |
| Homepage Header    | 1920 × 800 px       | Extra wide for hero carousel    |
| Team Member photo  | 400 × 400 px min    | Square, headshot                |
| Inline content     | 800–1200 px wide    | Depends on size setting         |
| Social share (SEO) | 1200 × 630 px       | Open Graph standard             |

All images support **hotspot cropping** — click the crop icon in the image field to set the focal point.

---

## 9. SEO

Pages and case studies can have SEO overrides:

- **SEO Title** — overrides the page title in the browser tab and search results
- **Meta Description** — short summary for search engines (keep under 160 characters)
- **Social Share Image** — image shown when the page is shared on social media (1200 × 630 px)

If no SEO overrides are set, the page title and site description are used as defaults.

---

## 10. Ordering Content

Many content types have a **Sort Order** (or **Order**) field:

- Lower numbers appear **first** in listings
- Items without an order number appear last
- Use increments of 10 (10, 20, 30...) to leave room for future insertions

Applies to: Case Studies, Features, Team Members, Homepage Headers.

---

## 11. Jobs

1. Click **Job** → **+ Create**.
2. Enter the **Title** (e.g. "Senior UX Designer").
3. Write the full **Description** using the rich text editor.
4. Set **Location** (e.g. "Arlington, MA" or "Remote").
5. Choose the **Type** (Full-time, Part-time, Contract, Internship).
6. Click **Publish**.

### Deactivating a Listing

Uncheck **Is Active** to remove from the Careers page without deleting. This preserves the listing for future reactivation.

---

## 12. Site Settings

Site Settings is a **singleton** — there's only one document. It controls:

- **Site Title** — appears in the browser tab
- **Description** — default meta description for SEO
- **Social Links** — LinkedIn, Twitter, Medium, Flickr, SoundCloud URLs in the footer
- **Footer Text** — tagline or blurb in the footer
- **Contact Info** — email, phone, and address shown in the footer and contact page

To edit: click **Site Settings** in the sidebar. Changes take effect on the next deployment.
