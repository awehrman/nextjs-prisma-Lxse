import {
  extendType,
  FieldResolver,
  idArg,
  objectType,
  asNexusMethod
} from 'nexus';
import { JSONResolver } from 'graphql-scalars';

import { getPendingCategoriesMeta, importLocalNotes } from '../resolvers/note';
import {
  getNotesContent,
  getNotesMeta,
  saveRecipes
} from 'graphql/resolvers/helpers/note/evernote-importer';

// TODO can this be an extension of NoteMeta?
export const Note = objectType({
  name: 'Note',
  definition(t) {
    t.string('id');
    t.string('createdAt');
    t.string('updatedAt');
    t.string('evernoteGUID');
    t.nonNull.string('title');
    t.string('source');
    t.list.field('categories', {
      type: 'Category'
    });
    t.list.field('tags', {
      type: 'Tag'
    });
    t.string('image');
    t.string('content');
    t.boolean('isParsed');
    t.list.field('ingredients', {
      type: 'IngredientLine'
    });
    t.list.field('instructions', {
      type: 'InstructionLine'
    });
  }
});

export const NoteMeta = objectType({
  name: 'NoteMeta',
  definition(t) {
    t.string('id');
    t.string('createdAt');
    t.string('updatedAt');
    t.string('evernoteGUID');
    t.nonNull.string('title');
    t.string('source');
    t.list.field('categories', {
      type: 'Category'
    });
    t.list.field('tags', {
      type: 'Tag'
    });
    t.string('image');
    t.string('content');
    t.boolean('isParsed');
  }
});

export const EvernoteNotesMetaResponse = objectType({
  name: 'EvernoteNotesMetaResponse',
  definition(t) {
    t.string('error');
    t.list.field('notes', { type: NoteMeta });
  }
});

export const EvernoteNotesResponse = objectType({
  name: 'EvernoteNotesResponse',
  definition(t) {
    t.string('error');
    t.list.field('notes', { type: Note });
  }
});

// Queries
export const NoteQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('note', {
      type: Note,
      args: { id: idArg() }
    });
  }
});

// TODO we'll want to paginate this
export const NotesQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.field('notes', {
      type: 'Note',
      resolve: async (_root, _args, ctx) => {
        // TODO move these selects somewhere so we can re-use them
        const notes = await ctx.prisma.note.findMany({
          take: 20,
          select: {
            id: true,
            source: true,
            title: true,
            evernoteGUID: true,
            image: true,
            content: true,
            isParsed: true,
            ingredients: {
              select: {
                id: true,
                reference: true,
                blockIndex: true,
                lineIndex: true,
                parsed: {
                  select: {
                    value: true
                  }
                },
                ingredient: {
                  select: {
                    id: true,
                    isComposedIngredient: true,
                    isValidated: true
                  }
                }
              }
            },
            instructions: {
              select: {
                id: true,
                blockIndex: true,
                reference: true
              }
            }
          }
        });
        return notes;
      }
    });
  }
});

// export const GetLocalImportMetaQuery = extendType({
//   type: 'Query',
//   definition(t) {
//     t.field('localImportMeta', {
//       type: LocalImportMeta
//     });
//   }
// });
// Mutations
export const GetNotesMeta = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('getNotesMeta', {
      type: 'EvernoteNotesMetaResponse',
      resolve: getNotesMeta as FieldResolver<'Mutation', 'getNotesMeta'>
    });
  }
});

export const GetNotesContent = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('getNotesContent', {
      type: 'EvernoteNotesResponse',
      resolve: getNotesContent as FieldResolver<'Mutation', 'getNotesContent'>
    });
  }
});

export const SaveRecipes = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('saveRecipes', {
      type: 'EvernoteNotesResponse',
      resolve: saveRecipes as FieldResolver<'Mutation', 'saveRecipes'>
    });
  }
});

export const ImportLocalNotes = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('importLocal', {
      type: 'EvernoteNotesResponse',
      args: {},
      resolve: importLocalNotes as FieldResolver<'Mutation', 'importLocal'>
    });
  }
});
// const LocalCategory = objectType({
//   name: 'LocalCategory',
//   definition(t) {
//     t.string('key');
//     t.int('value');
//   }
// });

// biome-ignore lint/suspicious/noShadowRestrictedNames: nexus
export const JSON = asNexusMethod(JSONResolver, 'json');

export const CategoriesResponse = objectType({
  name: 'CategoriesResponse',
  definition(t) {
    t.nullable.string('error');
    t.field('categories', { type: 'JSON' });
  }
});

export const GetPendingCategoriesQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('getPendingCategories', {
      type: 'CategoriesResponse',
      resolve: getPendingCategoriesMeta
    });
  }
});
