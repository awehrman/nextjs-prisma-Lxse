import { useQuery, useMutation, FetchResult } from '@apollo/client';
import { NoteWithRelations, StatusProps } from '@prisma/client';

import {
  GET_ALL_NOTES_QUERY,
  GET_PENDING_CATEGORIES_QUERY
} from '../graphql/queries/note';
import {
  GET_NOTES_METADATA_MUTATION,
  GET_NOTES_CONTENT_MUTATION,
  SAVE_RECIPES_MUTATION
} from '../graphql/mutations/note';
import { IMPORT_LOCAL_MUTATION } from '../graphql/mutations/import';
import { defaultLoadingStatus } from 'constants/note';
import { MAX_NOTES_LIMIT } from 'constants/evernote';
import React, { SetStateAction } from 'react';

type NotesResponse = {
  notes?: NoteWithRelations[];
};

function useNotes(
  setStatus: React.Dispatch<SetStateAction<StatusProps>>,
  status: StatusProps = defaultLoadingStatus
) {
  const { data = {}, loading, refetch } = useQuery(GET_ALL_NOTES_QUERY, {});

  const notes: NoteWithRelations[] = data?.notes ?? [];

  const categories = useQuery(GET_PENDING_CATEGORIES_QUERY, {});

  const [getNotesContent] = useMutation(GET_NOTES_CONTENT_MUTATION, {
    update: (cache, { data: { getNotesContent } }) => {
      const notesWithContent = getNotesContent?.notes ?? [];
      if (notesWithContent.length) {
        cache.writeQuery({
          query: GET_ALL_NOTES_QUERY,
          data: { notes: notesWithContent }
        });
      }

      const updatedStatus = { ...status };
      updatedStatus.meta = false;
      updatedStatus.content = false;
      setStatus(updatedStatus);
    }
  });

  const [getNotesMeta] = useMutation(GET_NOTES_METADATA_MUTATION, {
    optimisticResponse: {
      getNotesMeta: {
        notes: new Array(MAX_NOTES_LIMIT).fill(null).map((_empty, index) => ({
          // __typename: 'NoteMeta',
          id: `${index}-optimistic-note`,
          createdAt: new Date(),
          updatedAt: new Date(),
          source: null,
          content: null,
          image: null,
          evernoteGUID: `${index}-optimistic-note-guid`,
          title: 'Loading...',
          categories: [],
          tags: [],
          isParsed: false
        })),
        error: null
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: apollo
    update: (cache, response: FetchResult<any>) => {
      const returnedNotes = response?.data?.getNotesMeta?.notes ?? [];
      const isOptimisticResponse = returnedNotes.some(
        (note: NoteWithRelations) =>
          !!(note?.id ?? '').includes('optimistic-note')
      );
      const adjustedNotes = isOptimisticResponse
        ? returnedNotes.map((note: NoteWithRelations) => ({
            ...note,
            // __typename: 'Note',
            ingredients: [],
            instructions: []
          }))
        : returnedNotes.map((note: NoteWithRelations) => ({
            ingredients: [],
            instructions: [],
            ...note
            // __typename: 'Note'
          }));
      const existingNotes: NotesResponse | null = cache.readQuery({
        query: GET_ALL_NOTES_QUERY
      });

      const data = {
        notes: [...adjustedNotes, ...(existingNotes?.notes ?? [])]
      };

      if (data.notes.length > 0) {
        cache.writeQuery({
          query: GET_ALL_NOTES_QUERY,
          data
        });

        const updatedStatus = { ...status };

        // kick off the next process
        if (!isOptimisticResponse) {
          updatedStatus.meta = false;
          updatedStatus.content = true;
          setStatus(updatedStatus);
          return getNotesContent();
        }

        updatedStatus.meta = true;
        setStatus(updatedStatus);
      }
    }
  });

  const [saveRecipes] = useMutation(SAVE_RECIPES_MUTATION, {
    update: (cache) => {
      cache.writeQuery({
        query: GET_ALL_NOTES_QUERY,
        data: { notes: [] }
      });
      setStatus(defaultLoadingStatus);
    }
  });

  const [importLocal] = useMutation(IMPORT_LOCAL_MUTATION, {
    refetchQueries: [GET_ALL_NOTES_QUERY]
  });

  // TODO rename to be evernote specific
  function importNotes() {
    const updated = { ...status };
    updated.meta = true;
    setStatus(updated);
    getNotesMeta();
  }

  function importLocalNotes() {
    importLocal();
  }

  function getCategoriesMeta() {
    if (!categories.loading) {
      const { getPendingCategories } = categories.data;
      return getPendingCategories.categories;
    }
    return {};
  }

  return {
    meta: getCategoriesMeta(),
    importLocal,
    importLocalNotes,
    loading,
    notes,
    refetchNotes: refetch,
    saveRecipes
  };
}

export default useNotes;
