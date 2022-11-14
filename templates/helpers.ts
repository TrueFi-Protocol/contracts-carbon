export function if_public(visibility: string, opts) {
  if (visibility === 'public' || visibility === 'external' || visibility === undefined) {
    return opts.fn(this)
  } else {
    return opts.inverse(this)
  }
}
export function fileName() {
  return `# ${this.id.split('.')[0]}`
}
