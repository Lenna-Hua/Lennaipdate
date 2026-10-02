import { useEffect } from "react";
import { useLocation } from "wouter";
import projectsSeed from "@/data/projects.json";
import { SITE } from "@/lib/site";

const DEFAULT_TITLE = `${SITE.name} — ${SITE.role}`;

function titleForPath(path: string): { title: string; description: string } {
  const clean = path.replace(/\/+$/, "") || "/";

  if (clean === "/" || clean === "/home") {
    return { title: DEFAULT_TITLE, description: SITE.description };
  }
  if (clean === "/work") {
    return {
      title: `Work — ${SITE.name}`,
      description: `UX research and product design case studies by ${SITE.name}, ${SITE.role} in ${SITE.location}.`,
    };
  }
  if (clean.startsWith("/work/")) {
    const slug = clean.slice("/work/".length);
    const project = projectsSeed.find((p) => p.slug === slug);
    const projectTitle = project?.title?.trim();
    return {
      title: projectTitle ? `${projectTitle} — ${SITE.name}` : `Case study — ${SITE.name}`,
      description: project?.subtitle?.trim() || SITE.description,
    };
  }
  if (clean === "/studio" || clean.startsWith("/studio/")) {
    return {
      title: `Studio — ${SITE.name}`,
      description: `Art, illustration, and creative direction by ${SITE.name}.`,
    };
  }
  if (clean === "/about") {
    return {
      title: `About — ${SITE.name}`,
      description: `${SITE.name} is a ${SITE.role} based in ${SITE.location}, specializing in UX research, service design, and visual storytelling.`,
    };
  }
  if (clean === "/privacy") {
    return {
      title: `Privacy Policy — ${SITE.name}`,
      description: `How ${SITE.name} collects, uses, and protects information on ${SITE.url.replace("https://", "")}.`,
    };
  }
  if (clean === "/terms") {
    return {
      title: `Terms of Use — ${SITE.name}`,
      description: `Terms of use for ${SITE.name}'s product design portfolio.`,
    };
  }
  return { title: DEFAULT_TITLE, description: SITE.description };
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SiteMeta() {
  const [location] = useLocation();

  useEffect(() => {
    const { title, description } = titleForPath(location);
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", `${SITE.url}${location === "/" ? "" : location}`, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    const canonicalHref = `${SITE.url}${location === "/" ? "" : location}`;
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalHref);
  }, [location]);

  return null;
}
