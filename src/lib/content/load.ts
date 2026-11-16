import "server-only";

import { buildArticles } from "./help";
import { buildPosts } from "./blog";
import { cached, readFolder } from "./files";

/** The blog and Help files, read from content/ on the server. */
export const getPosts = cached(() => buildPosts(readFolder("blog")));
export const getArticles = cached(() => buildArticles(readFolder("help")));
