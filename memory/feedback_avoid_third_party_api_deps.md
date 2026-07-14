---
name: feedback-avoid-third-party-api-deps
description: User prefers not to take on third-party API dependencies (e.g. Google Places, Maps) for the Climb Kiddo site unless they explicitly ask for it
metadata:
  type: feedback
---

When proposing how to wire up a feature on the Climb Kiddo site, do not push solutions that require signing up for and managing a third-party API (Google Places, Maps, Firebase, etc.). The user declined the Google Places API path for pulling real reviews into the testimonials section, with the reasoning "lets not do it now if this is google dependent."

**Why:** the user wants to keep the site's runtime dependencies minimal and avoid the overhead of API keys, billing dashboards, and quota management for a small marketing site.

**How to apply:** when a feature could be built either against a third-party API or with a self-hosted/editable approach (admin CMS, manifest file in Blob, hardcoded content), default to the self-hosted approach and only mention the API option as a footnote if it's clearly superior. Examples: testimonials → small admin form writing to a manifest (like the existing `/gms/gallery` flow), not Google Places; maps → static image or simple OSM embed, not Google Maps JS API.
