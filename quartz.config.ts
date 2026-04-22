import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Tony's Knowledge Garden",
    pageTitleSuffix: " | Z TURNS",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "google",
      tagId: "G-LT25GZHFRX",
    },
    locale: "en-US",
    baseUrl: "notes.zturnsgo.com",
    ignorePatterns: ["private", "templates", ".obsidian", ".publish-excluded", "Projects/PUBLISH-CHECKLIST.md"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Instrument Serif",
        body: "Manrope",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#faf9f7",
          lightgray: "#e8e4dc",
          gray: "#b0a898",
          darkgray: "#3d3530",
          dark: "#1a1410",
          secondary: "#c49a2a",
          tertiary: "#8faa6e",
          highlight: "rgba(196, 154, 42, 0.12)",
          textHighlight: "#e7bd5788",
        },
        darkMode: {
          light: "#07111f",
          lightgray: "#1a2535",
          gray: "#4a5a72",
          darkgray: "#a9b7cf",
          dark: "#e6edf8",
          secondary: "#e7bd57",
          tertiary: "#84a59d",
          highlight: "rgba(231, 189, 87, 0.14)",
          textHighlight: "#e7bd5744",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
