import { supabase } from "../helper/supabaseClient.js";

export const getUserByIdInForum = async (userId, withUserDetails = false) => {
  const { data: user, error } = await supabase
    .from("user")
    .select(withUserDetails ? "uid, username, email, photoURL" : "uid")
    .eq("uid", userId)
    .single();

  return { user, error };
};

export const getForumById = async forumId => {
  const { data: forum, error } = await supabase.from("forum").select("*").eq("id_forum", forumId);

  return { forum, error };
};

export const getAllForum = async () => {
  const { data: forums, error } = await supabase.from("forum").select("*");

  return { forums, error };
};

export const getAllComments = async () => {
  const { data: comments, error } = await supabase.from("comments").select("*");

  return { comments, error };
};

const getAuthorForum = async forumId => {
  const { user, error } = await getUserByIdInForum(forumId.id_user, true);

  if (error) return { error };

  return user;
};

export const getForumWithComments = async (withUser = false) => {
  const { forums, error: forumError } = await getAllForum();
  const { comments, error: commentError } = await getAllComments();
  const { user: authorForum, error: userError } = await getUserByIdInForum(forums[0].id_user, true);

  if (forumError) return { error: forumError, message: "Something wrong with forum" };
  if (commentError) return { error: commentError, message: "Something wrong with comment" };
  if (userError) return { error: userError, message: "Something wrong with user" };

  const forumCommentsWithUsers = await Promise.all(
    forums.map(async forum => {
      const forumComments = comments.filter(comment => comment.id_forum === forum.id_forum);

      const authorForum = await getAuthorForum(forum);
      forum.author = authorForum;
      delete forum.id_user;

      const commentsFormatted = await Promise.all(
        forumComments.map(async comment => {
          if (withUser) {
            const userComment = await getUserByIdInForum(comment.id_user, true);

            delete comment.id_user;
            return { ...comment, user: userComment.user };
          } else {
            return comment;
          }
        }),
      );

      return { ...forum, comments: commentsFormatted };
    }),
  );

  return { forums: forumCommentsWithUsers };
};
