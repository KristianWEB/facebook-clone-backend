const Post = require("../../models/Post");
const Comment = require("../../models/Comment");
const getAuthenticatedUser = require("../middlewares/authenticated");
const notifications = require("./notifications");
const Notification = require("../../models/Notification");

module.exports = {
  Mutation: {
    createComment: async (_, { postId, body }, context) => {
      const { user } = getAuthenticatedUser(context);
      if (!user) {
        throw new Error("Unauthenticated!");
      }

      if (body.trim() === "") {
        throw new Error("Comment can't be empty!");
      }
      const post = await Post.findOne({ _id: postId });
      if (post) {
        const newComment = new Comment({
          body,
          postId,
          userId: user.id,
        });
        const comment = await newComment.save();

        post.comments.push(comment._id);

        if (user.id !== post.userId.toString()) {
          notifications.Mutation.createNotification({
            creatorId: user.id,
            notifierId: post.userId,
            actionId: post._id,
            action: "has commented on your post",
          });
        }

        await post.save();

        return comment;
      }
      throw new Error("Post not found");
    },
    deleteComment: async (_, { postId, commentId }, context) => {
      const { user } = getAuthenticatedUser(context);

      const post = await Post.findOne({ _id: postId });

      if (post) {
        const comment = await Comment.findById(commentId);

        if (comment.userId.toString() === user.id) {
          post.comments.splice(comment, 1);

          await Comment.find({ userId: user.id }).deleteOne();

          await Notification.find({
            creator: user.id,
            actionId: post._id,
          }).deleteOne();

          await post.save();

          return comment;
        }
        throw new Error("Action not allowed");
      } else {
        throw new Error("Post not found");
      }
    },
  },
};