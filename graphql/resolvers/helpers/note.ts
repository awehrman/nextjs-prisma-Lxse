import {
  IngredientLineWithParsed,
  IngredientWithAltNames,
  NoteMeta,
  NoteWithRelations,
  ParsedSegment,
  Prisma,
  PrismaClient
} from '@prisma/client';
import { AuthenticationError } from 'apollo-server-micro';
import Evernote from 'evernote';

import {
  METADATA_NOTE_SPEC,
  MAX_NOTES_LIMIT,
  NOTE_FILTER,
  NOTE_SPEC
} from 'constants/evernote';
import { AppContext } from '../../context';

import { addNewCategories } from './category';
import { getEvernoteStore } from './evernote-session';
import { uploadImage } from './image';
import { parseHTML } from './parser';
import { addNewTags } from './tag';
import { formatInstructionLinesUpsert } from './ingredient/instruction-line';
import { formatIngredientLinesUpsert } from './ingredient/ingredient-line';

export const fetchNotesMeta = async (
  ctx: AppContext,
  offset?: number
): Promise<NoteMeta[]> => {
  const { session } = ctx;
  if (!session) {
    throw new AuthenticationError('No evernote session available');
  }
  const store = await getEvernoteStore(session.user.evernote);
  const { noteImportOffset = 0 } = session?.user;

  const notes: NoteMeta[] = await store
    .findNotesMetadata(
      NOTE_FILTER,
      offset ?? noteImportOffset,
      MAX_NOTES_LIMIT,
      METADATA_NOTE_SPEC
    )
    .then(async (meta: Evernote.NoteStore.NotesMetadataList) =>
      saveNoteMetaData(ctx, store, meta?.notes ?? [])
    );

  await incrementOffset(ctx, (offset ?? noteImportOffset) + notes.length);
  return notes;
};

const saveNoteMetaData = async (
  ctx: AppContext,
  store: Evernote.NoteStoreClient,
  notesMeta: Evernote.NoteStore.NoteMetadata[] = []
): Promise<NoteMeta[]> => {
  const { prisma } = ctx;
  await verifyNotes(ctx, notesMeta);

  const categoriesHash = await addNewCategories(prisma, store, notesMeta);
  const tagsHash = await addNewTags(prisma, store, notesMeta);

  const notes: NoteMeta[] = await prisma.$transaction(
    notesMeta.map((meta: NoteMeta) => {
      const data: Prisma.NoteCreateInput = {
        title: `${meta.title}`,
        evernoteGUID: `${meta.guid}`,
        source: meta?.attributes?.sourceURL ?? null
      };

      const categoryId: string | null =
        meta?.notebookGuid && categoriesHash?.[meta.notebookGuid]
          ? `${categoriesHash[meta.notebookGuid]?.id}`
          : null;

      if (categoryId) {
        data.categories = {
          connect: { id: categoryId }
        };
      }

      const tagGuids: Prisma.TagWhereUniqueInput[] = (meta.tagGuids ?? []).map(
        (guid: string) => ({
          id: `${tagsHash[guid]?.id}`
        })
      );

      if (tagGuids?.length) {
        data.tags = {
          connect: tagGuids
        };
      }

      const select = {
        id: true,
        title: true,
        source: true,
        evernoteGUID: true,
        tags: {
          select: {
            id: true,
            name: true,
            evernoteGUID: true
          }
        },
        categories: {
          select: {
            id: true,
            name: true,
            evernoteGUID: true
          }
        }
      };

      return prisma.note.create({
        data,
        select
      });
    })
  );

  return notes;
};

const verifyNotes = async (
  ctx: AppContext,
  notes: Evernote.NoteStore.NoteMetadata[]
): Promise<Evernote.NoteStore.NoteMetadata[]> => {
  const { prisma, session } = ctx;
  const { noteImportOffset = 0 } = session?.user;

  // check if we've already imported any of these notes
  const evernoteGUIDs = notes.map(
    (note: Evernote.NoteStore.NoteMetadata) => `${note.guid}`
  );
  const existingNotes = await prisma.note.findMany({
    where: {
      evernoteGUID: {
        in: evernoteGUIDs
      }
    }
  });

  if (!existingNotes.length) {
    return notes;
  }
  const offset = noteImportOffset + existingNotes.length;
  console.log('incrementing', offset);
  await incrementOffset(ctx, offset);
  const moreNotes = await fetchNotesMeta(ctx, offset);
  console.log('moreNotes', moreNotes.length);
  return [...moreNotes, ...notes];
};

const incrementOffset = async (
  ctx: AppContext,
  noteImportOffset: number
): Promise<void> => {
  const { prisma, session } = ctx;

  if (session) {
    console.log('updating offset for user', noteImportOffset);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        noteImportOffset
      }
    });
  }
};

export const fetchNotesContent = async (
  ctx: AppContext
): Promise<NoteWithRelations[]> => {
  const { prisma, session } = ctx;
  if (!session) {
    throw new AuthenticationError('No evernote session available');
  }
  const store = await getEvernoteStore(session.user.evernote);

  const notesSansContent: NoteMeta[] | undefined = await prisma.note.findMany({
    where: { content: null },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      evernoteGUID: true,
      title: true,
      source: true,
      image: true,
      content: true,
      isParsed: true,
      categories: {
        select: {
          id: true,
          name: true
        }
      },
      tags: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!notesSansContent?.length) {
    return [];
  }

  const { parsedNotes, ingHash } = await getParsedNoteContent(
    notesSansContent,
    store
  );
  const updatedHash = await saveNoteIngredients(ingHash, prisma);

  const notes = await saveNotes(parsedNotes, updatedHash, prisma);

  return notes;
};

const saveNoteIngredients = async (
  ingHash: IngredientHash,
  prisma: PrismaClient
): Promise<IngredientHash> => {
  // attempt to create new ingredients; any existing should be skipped
  await prisma.ingredient.createMany({
    data: ingHash.createData,
    skipDuplicates: true
  });

  const select = {
    id: true,
    name: true,
    plural: true,
    properties: true,
    isComposedIngredient: true,
    isValidated: true,
    alternateNames: {
      select: {
        name: true
      }
    }
  };

  const where = {
    OR: [
      {
        name: {
          in: ingHash.matchBy
        }
      },
      {
        plural: {
          in: ingHash.matchBy
        }
      },
      {
        alternateNames: {
          some: {
            name: {
              in: ingHash.matchBy
            }
          }
        }
      }
    ]
  };

  // lookup these new ingredients
  const ingredients = await prisma.ingredient.findMany({
    where,
    select
  });

  // setup quick ingredient access by value
  const valueHash: IngredientValueHash = {};
  ingredients.forEach((ing) => {
    valueHash[ing.name] = ing;
    if (ing?.plural) {
      valueHash[ing.plural] = ing;
    }

    (ing.alternateNames ?? []).forEach((alt) => {
      valueHash[alt.name] = ing;
    });
  });
  ingHash.valueHash = valueHash;

  return ingHash;
};

// TODO move
type IngredientValueHash = {
  [value: string]: IngredientWithAltNames | null;
};

type CreateIngredientData = {
  name: string;
  plural?: string;
};

type IngredientHash = {
  matchBy: string[];
  valueHash: IngredientValueHash;
  createData: CreateIngredientData[];
};

type CreateParsedSegment = {
  // updatedAt: Date
  index: number;
  rule: string;
  type: string;
  value: string;
  ingredientId: string | null;
  ingredientLineId: string;
};

const saveNotes = async (
  parsedNotes: NoteWithRelations[],
  ingHash: IngredientHash,
  prisma: PrismaClient
): Promise<NoteWithRelations[]> => {
  const noteIds: string[] = [];

  // update notes with content, ingredients and instruction lines
  const basicNotes: NoteWithRelations = await prisma.$transaction(
    parsedNotes.map((note: NoteWithRelations) => {
      noteIds.push(note.id);
      const ingredients: Prisma.IngredientLineUpdateManyWithoutNoteNestedInput =
        formatIngredientLinesUpsert(note.ingredients, ingHash);
      const instructions: Prisma.InstructionLineUpdateManyWithoutNoteNestedInput =
        formatInstructionLinesUpsert(note.instructions);
      const data: Prisma.NoteUpdateInput = {
        title: note.title,
        source: note.source,
        // TODO categories?:
        // TODO tags?:
        image: note.image,
        content: note.content,
        ingredients,
        instructions,
        isParsed: true
      };

      return prisma.note.update({
        data,
        where: { id: note.id },
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
              isParsed: true
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
    })
  );

  // update the parsedSegments and link to our ingredients line
  const data: Prisma.ParsedSegmentCreateManyInput[] = [];

  parsedNotes.forEach((note: NoteWithRelations, noteIndex: number) => {
    const { ingredients } = note;
    ingredients.forEach((line: IngredientLineWithParsed, lineIndex: number) => {
      const ingredientLineId: string | null =
        basicNotes?.[noteIndex]?.ingredients?.[lineIndex]?.id ?? null;

      if (ingredientLineId) {
        line.parsed.forEach((parsed: ParsedSegment) => {
          const ingredientId: string | null =
            parsed.type === 'ingredient'
              ? ingHash.valueHash?.[parsed.value]?.id ?? null
              : null;
          const segment: CreateParsedSegment = {
            // updatedAt
            index: parsed.index,
            rule: parsed.rule,
            type: parsed.type,
            value: parsed.value,
            ingredientId: parsed.type === 'ingredient' ? ingredientId : null,
            ingredientLineId
          };
          data.push(segment);
        });
      }
    });
  });

  await prisma.parsedSegment.createMany({
    data,
    skipDuplicates: true
  });

  // fetch updated note
  const notes = await prisma.note.findMany({
    where: {
      id: {
        in: noteIds
      }
    },
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
          isParsed: true,
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
};

type NotesWithIngredients = {
  parsedNotes: NoteWithRelations[];
  ingHash: IngredientHash;
};

const getParsedNoteContent = async (
  notesSansContent: NoteMeta[],
  store: Evernote.NoteStoreClient
): Promise<NotesWithIngredients> => {
  const ingHash: IngredientHash = {
    matchBy: [],
    valueHash: {},
    createData: []
  };
  const parsedNotes = await Promise.all(
    notesSansContent.map(
      async (noteMeta) =>
        await getNoteContent(noteMeta, store)
          .then((note) => parseNoteContent(note, ingHash))
          .then((response: ParsedNoteContent) => {
            ingHash.matchBy = [
              ...new Set([...ingHash.matchBy, ...response.ingHash.matchBy])
            ];
            ingHash.valueHash = {
              ...ingHash.valueHash,
              ...response.ingHash.valueHash
            };
            ingHash.createData = [
              ...new Set([
                ...ingHash.createData,
                ...response.ingHash.createData
              ])
            ];
            return response.parsedNote;
          })
    )
  );

  return { parsedNotes, ingHash };
};

const getNoteContent = async (
  noteMeta: NoteMeta,
  store: Evernote.NoteStoreClient
): Promise<NoteWithRelations> => {
  const { content, resources } = await store.getNoteWithResultSpec(
    noteMeta.evernoteGUID,
    NOTE_SPEC
  );

  // get image data
  const imageBinary = resources?.[0]?.data?.body ?? null;
  let image = null;
  if (imageBinary) {
    const buffer = Buffer.from(imageBinary);
    const folder = { folder: 'recipes' };
    image = await uploadImage(buffer, folder).then((data) => data?.secure_url);
  }

  const note: NoteWithRelations = {
    ...noteMeta,
    content: `${content}`,
    image: image ? `${image}` : null
  };

  return note;
};

type ParsedNoteContent = {
  parsedNote: NoteWithRelations;
  ingHash: IngredientHash;
};

const parseNoteContent = (
  note: NoteWithRelations,
  ingHash: IngredientHash
): ParsedNoteContent => {
  const response = parseHTML(note, ingHash);

  return {
    parsedNote: {
      ...note,
      ingredients: response.ingredients,
      instructions: response.instructions
    },
    ingHash: { ...response.ingHash }
  };
};