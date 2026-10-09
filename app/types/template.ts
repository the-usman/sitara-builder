export interface Template {
  name: string;
  label: string;
  description: string;
  githubRepo: string;

  /** Built-in files; when set, the template is not fetched from `githubRepo`. */
  localFiles?: Array<{ path: string; content: string }>;
  tags?: string[];
  icon?: string;
}
