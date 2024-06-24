import pool from "../lib/db-neon.js";

// Get user by ID in forum
export const getUserByIdInForum = async (userId, withUserDetails = false) => {
  const client = await pool.connect();
  try {
    const query = withUserDetails
      ? 'SELECT uid, username, email, "photo_url" FROM "users" WHERE uid = $1'
      : 'SELECT uid FROM "users" WHERE uid = $1';
    const result = await client.query(query, [userId]);
    return { user: result.rows[0], error: null };
  } catch (error) {
    return { user: null, error };
  } finally {
    client.release();
  }
};

// Get forum by ID
export const getForumById = async forumId => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM "forum" WHERE id_forum = $1', [forumId]);
    return { forum: result.rows[0], error: null };
  } catch (error) {
    return { forum: null, error };
  } finally {
    client.release();
  }
};

// Get all forums
export const getAllForum = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM "forum"');
    return { forums: result.rows, error: null };
  } catch (error) {
    return { forums: null, error };
  } finally {
    client.release();
  }
};

// Get all comments
export const getAllComments = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM "comment"');
    return { comments: result.rows, error: null };
  } catch (error) {
    return { comments: null, error };
  } finally {
    client.release();
  }
};

// Get author forum
const getAuthorForum = async userId => {
  const { user, error } = await getUserByIdInForum(userId, true);
  if (error) return { error };
  return user;
};

// Get forum with comments
export const getForumWithComments = async (withUser = false) => {
  const { forums, error: forumError } = await getAllForum();
  const { comments, error: commentError } = await getAllComments();

  if (forumError) return { error: forumError, message: "Something wrong with forum" };
  if (commentError) return { error: commentError, message: "Something wrong with comment" };

  const forumCommentsWithUsers = await Promise.all(
    forums.map(async forum => {
      const forumComments = comments.filter(comment => comment.id_forum === forum.id_forum);

      const authorForum = await getAuthorForum(forum.id_user);
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
