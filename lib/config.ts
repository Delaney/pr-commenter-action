import * as Mustache from 'mustache';
import { Context } from 'mustache';

type ConfigObject = {
  comment: {
    header?: string | null;
    'on-create'?: string | null;
    'on-update'?: string | null;
    'glob-options'?: object;
    footer?: string | null;
    snippets?: SnippetObject[];
  }
};

type SnippetObject = {
  id: string;
  body: string;
  files: (string | FileMatcher)[];
};

type FileMatcher = {
  any?: string[];
  all?: string[];
};

function validateCommentConfig(configObject: ConfigObject, templateVariables: Context): Map<string, unknown> {
  const configMap = new Map<string, unknown>();

  if (typeof configObject.comment !== 'object') {
    throw Error(
      `found unexpected value type '${typeof configObject.comment}' under key '.comment' (should be an object)`,
    );
  }

  if (configObject.comment.header === undefined || configObject.comment.header === null) {
    configMap.set('header', configObject.comment.header);
  } else {
    throw Error(
      `found unexpected value type '${typeof configObject.comment.header}' under key '.comment.header' (should be a string)`,
    );
  }

  const allowedOnCreateValues = ['create', 'nothing'];
  if (configObject.comment['on-create'] === undefined || configObject.comment['on-create'] === null) {
    configMap.set('onCreate', allowedOnCreateValues[0]);
  } else if (typeof configObject.comment['on-create'] === 'string') {
    const onCreate = Mustache.render(configObject.comment['on-create'], templateVariables);

    if (allowedOnCreateValues.includes(onCreate as typeof allowedOnCreateValues[number])) {
      configMap.set('onCreate', onCreate);
    } else {
      throw Error(
        `found unexpected value '${onCreate}' under key '.comment.on-create' (should be one of: ${allowedOnCreateValues.join(', ')})`,
      );
    }
  } else {
    throw Error(
      `found unexpected value type '${typeof configObject.comment['on-create']}' under key '.comment.on-create' (should be a string)`,
    );
  }

  const allowedOnUpdateValues = ['recreate', 'edit', 'nothing'] as const;
  if (configObject.comment['on-update'] === undefined || configObject.comment['on-update'] === null) {
    configMap.set('onUpdate', allowedOnUpdateValues[0]);
  } else if (typeof configObject.comment['on-update'] === 'string') {
    const onUpdate = Mustache.render(configObject.comment['on-update'], templateVariables);

    if (allowedOnUpdateValues.includes(onUpdate as typeof allowedOnUpdateValues[number])) {
      configMap.set('onUpdate', onUpdate);
    } else {
      throw Error(
        `found unexpected value '${onUpdate}' under key '.comment.on-update' (should be one of: ${allowedOnUpdateValues.join(', ')})`,
      );
    }
  } else {
    throw Error(
      `found unexpected value type '${typeof configObject.comment['on-update']}' under key '.comment.on-update' (should be a string)`,
    );
  }

  if (configObject.comment['glob-options'] && typeof configObject.comment['glob-options'] === 'object') {
    configMap.set('globOptions', configObject.comment['glob-options']);
  }

  if (configObject.comment.footer === undefined || configObject.comment.footer === null || typeof configObject.comment.footer === 'string') {
    configMap.set('footer', configObject.comment.footer);
  } else {
    throw Error(
      `found unexpected value type '${typeof configObject.comment.footer}' under key '.comment.footer' (should be a string)`,
    );
  }

  if (Array.isArray(configObject.comment.snippets) && configObject.comment.snippets.length > 0) {
    configMap.set('snippets', configObject.comment.snippets.map((snippetObject, index) => {
      const snippetMap = new Map<string, unknown>();

      const id = Mustache.render(snippetObject.id, templateVariables);
      const regex = /^[A-Za-z0-9\-_,]*$/;
      if (regex.exec(id)) {
        snippetMap.set('id', id);
      } else {
        throw Error(
          `found invalid snippet id '${id}' (snippet ids must contain only letters, numbers, dashes, and underscores)`,
        );
      }

      snippetMap.set('body', snippetObject.body);

      const isValidMatcher = (matcher: string | FileMatcher): boolean => {
        if (typeof matcher === 'string') return true;
        if (typeof matcher !== 'object' || matcher === null) return false;

        const isAnyValid = !matcher.any || (Array.isArray(matcher.any) && matcher.any.length > 0);

        const isAllValid = !matcher.all || (Array.isArray(matcher.all) && matcher.all.length > 0);

        const isAtLeastOnePresent = (!!matcher.any || !!matcher.all);

        return isAnyValid && isAllValid && isAtLeastOnePresent;
      };
      const isValidFileList = (list: (string | FileMatcher)[]): boolean => Array.isArray(list) && list.length > 0;

      if (isValidFileList(snippetObject.files)) {
        const list = snippetObject.files.map((matcher, matcherIndex) => {
          if (isValidMatcher(matcher)) {
            if (typeof matcher === 'string') {
              return matcher;
            }
            const obj: FileMatcher = {};
            if (matcher.any) {
              obj.any = matcher.any;
            }
            if (matcher.all) {
              obj.all = matcher.all;
            }
            return obj;
          } else {
            throw Error(
                `found unexpected value type under key '.comment.snippets.${index}.files.${matcherIndex}' (should be a string or an object with keys 'all' and/or 'any')`,
            );
          }
        });
        snippetMap.set('files', list);
      } else {
        throw Error(
          `found unexpected value type under key '.comment.snippets.${index}.files' (should be a non-empty array)`,
        );
      }

      return snippetMap;
    }));

    const snippetIds = (configMap.get('snippets') as Map<string, unknown>[]).map((s: Map<string, unknown>) => s.get('id') as string);
    snippetIds.forEach((value: string, index: number, self: string[]) => {
      if (self.indexOf(value) !== index) {
        throw Error(
          `found duplicate snippet id '${value}'`,
        );
      }
    });
  } else {
    throw Error(
      'found unexpected value type under key \'.comment.snippets\' (should be a non-empty array)',
    );
  }

  return configMap;
}

export { validateCommentConfig };
