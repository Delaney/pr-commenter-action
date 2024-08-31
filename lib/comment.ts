import * as Mustache from 'mustache';
import { Comment } from '../types/global.type';

function commentMetadata(snippetIds: string[]): string {
  return `<!-- pr-commenter-metadata: ${snippetIds.join(',')} -->`;
}

function extractCommentMetadata(commentBody: string): string[] | null {
  // snippet id regex plus a comma
  const regex = /<!-- pr-commenter-metadata: ([A-Za-z0-9\-_,]*) -->/;
  const match = regex.exec(commentBody);

  if (match) {
    return match[1].split(',').map((s: string) => s.trim()).filter((s) => s !== '');
  }
  return null;
}

function assembleCommentBody(
    snippetIds: string[],
    commentConfig: Map<string, unknown>,
    templateVariables:  Record<string, string> = {}): string {
  let strings = [
    commentConfig.get('header') as string | undefined,
    ...(commentConfig.get('snippets') as Map<string, unknown>[]).map((snippet) => {
      if (snippetIds.includes(snippet.get('id') as string)) {
        return snippet.get('body') as string;
      }
      return null;
    }),
    commentConfig.get('footer'),
    commentMetadata(snippetIds),
  ];

  strings = strings.filter((s) => Boolean(s));

  const rawCommentBody = strings.join('\n\n');

  return Mustache.render(rawCommentBody, templateVariables);
}

function newCommentDifferentThanPreviousComment(previousComment: Comment, snippetIds: string[]): boolean {
  const previousSnippetIds = extractCommentMetadata(previousComment.body);

  return previousSnippetIds !== null && previousSnippetIds.join(',') !== snippetIds.join(',');
}

function newCommentWouldHaveContent(snippetIds: string[]): boolean {
  return snippetIds.length > 0;
}

function shouldPostNewComment(
    previousComment: Comment | null,
    snippetIds: string[],
    commentConfig: Map<string, unknown>
): boolean {
  const isNotEmpty = newCommentWouldHaveContent(snippetIds);
  const isCreating = !previousComment && commentConfig.get('onCreate') === 'create';
  const isUpdating = !!previousComment
    && commentConfig.get('onUpdate') === 'recreate'
    && newCommentDifferentThanPreviousComment(previousComment, snippetIds);

  return isNotEmpty && (isCreating || isUpdating);
}

function shouldDeletePreviousComment(
    previousComment: Comment | null,
    snippetIds: string[],
    commentConfig: Map<string, unknown>
): boolean {
  return !!previousComment && (
    shouldPostNewComment(previousComment, snippetIds, commentConfig)
    || (!newCommentWouldHaveContent(snippetIds) && commentConfig.get('onUpdate') !== 'nothing')
  );
}

function shouldEditPreviousComment(
    previousComment: Comment | null,
    snippetIds: string[],
    commentConfig: Map<string, unknown>
): boolean {
  return newCommentWouldHaveContent(snippetIds) && (
    !!previousComment
      && commentConfig.get('onUpdate') === 'edit'
      && newCommentDifferentThanPreviousComment(previousComment, snippetIds)
  );
}

export {
  assembleCommentBody,
  extractCommentMetadata,
  shouldPostNewComment,
  shouldDeletePreviousComment,
  shouldEditPreviousComment,
};
