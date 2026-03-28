import { describe, expect, it } from 'vitest';
import { kebabCase, pascalCase, pluralize, singularize } from '../src/compiler/naming';

describe('naming', () => {
  it('transforms names', () => {
    expect(kebabCase('blogPost')).toBe('blog-post');
    expect(pascalCase('blog-post')).toBe('BlogPost');
    expect(pluralize('user')).toBe('users');
    expect(singularize('users')).toBe('user');
  });
});
