'use client';

import { useState } from 'react';
import { EyeOff, Flag, Heart, MessageSquare } from 'lucide-react';
import { Card } from '@/components/Card';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { useToast } from '@/components/ui/ToastProvider';
import { PostComposer } from '@/components/community/PostComposer';
import { AliasSetup } from '@/components/community/AliasSetup';
import { FEED_DISCLAIMER, REPLY_MAX_LENGTH } from '@/lib/community';
import type { FeedPost, FeedReply } from '@/lib/server/community';

function since(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Byline({ post }: { post: FeedReply }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-foreground">{post.alias}</span>
      <span className="text-muted-foreground">{since(post.createdAt)}</span>
      {post.mine && <span className="text-[10px] font-bold uppercase tracking-wide text-primary">You</span>}
      {post.hidden && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
          <EyeOff className="h-2.5 w-2.5" /> Hidden by the academy
        </span>
      )}
    </div>
  );
}

export function CommunityFeed({
  initialPosts,
  initialCursor,
  canPost,
  canModerate,
  alias,
}: {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  /** Paying members post, reply and like. Free profiles read and can report. */
  canPost: boolean;
  canModerate: boolean;
  alias: string | null;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [myAlias, setMyAlias] = useState<string | null>(alias);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { pushToast } = useToast();

  function prependPost(post: FeedPost) {
    setPosts((prev) => [post, ...prev]);
  }

  function appendReply(parentId: string, reply: FeedReply) {
    setPosts((prev) =>
      prev.map((p) => (p.id === parentId ? { ...p, replies: [...p.replies, reply], replyCount: p.replyCount + 1 } : p)),
    );
    setReplyingTo(null);
  }

  async function toggleLike(post: FeedPost) {
    if (busy) return;
    setBusy(post.id);
    // Optimistic: a like is cheap and reverting on failure is less jarring than
    // a heart that waits half a second to fill in.
    const optimistic = !post.likedByMe;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likedByMe: optimistic, likeCount: p.likeCount + (optimistic ? 1 : -1) } : p)),
    );
    try {
      const res = await fetch(`/api/community/posts/${post.id}/like`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Could not update');
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likedByMe: json.data.liked, likeCount: json.data.likeCount } : p)),
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likedByMe: post.likedByMe, likeCount: post.likeCount } : p,
        ),
      );
      pushToast('Could not update that like', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function report(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/community/posts/${id}/report`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error();
      pushToast('Reported. An admin will take a look.', 'success');
    } catch {
      pushToast('Could not report that post', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/community/posts?cursor=${encodeURIComponent(cursor)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setPosts((prev) => [...prev, ...json.data.posts]);
        setCursor(json.data.nextCursor);
      }
    } catch {
      pushToast('Could not load more', 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      {!canPost && <UpgradePrompt feature="communityPost" />}

      {canPost && !myAlias && <AliasSetup onSet={setMyAlias} />}

      {canPost && myAlias && (
        <Card title="Post to the feed">
          <PostComposer alias={myAlias} onPosted={prependPost} />
          <p className="mt-3 text-xs text-muted-foreground">{FEED_DISCLAIMER}</p>
        </Card>
      )}

      {posts.length === 0 ? (
        <Card title="Nothing here yet">
          <p className="text-sm text-muted-foreground">
            No one has posted yet. {canPost ? 'Be the first.' : 'Check back shortly.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <Byline post={post} />
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {post.body || <span className="italic text-muted-foreground">This post was removed.</span>}
              </p>

              {/* A hidden or removed post offers no actions. The server refuses
                  them anyway, so a Like button here would only ever produce an
                  error the member cannot do anything about. */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                {!post.hidden && (
                  <>
                <button
                  onClick={() => (canPost ? toggleLike(post) : pushToast('Liking comes with the paid membership.', 'info'))}
                  disabled={busy === post.id}
                  className={`inline-flex items-center gap-1.5 font-semibold transition disabled:opacity-60 ${
                    post.likedByMe ? 'text-rose-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={post.likedByMe}
                >
                  <Heart className={`h-3.5 w-3.5 ${post.likedByMe ? 'fill-rose-500' : ''}`} />
                  {post.likeCount > 0 ? post.likeCount : 'Like'}
                </button>

                <button
                  onClick={() =>
                    canPost
                      ? setReplyingTo((v) => (v === post.id ? null : post.id))
                      : pushToast('Replying comes with the paid membership.', 'info')
                  }
                  className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {post.replyCount > 0 ? `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
                </button>

                {/* Reporting is open to free profiles too: they do most of the
                    reading, so they are as likely to be the ones who see
                    something that should not be there. */}
                {!post.mine && (
                  <button
                    onClick={() => report(post.id)}
                    disabled={busy === post.id}
                    className="ml-auto inline-flex items-center gap-1.5 font-semibold text-muted-foreground transition hover:text-rose-500 disabled:opacity-60"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report
                  </button>
                )}
                  </>
                )}
                {canModerate && (
                  <a href="/admin/community" className="font-semibold text-primary hover:underline">
                    Moderate
                  </a>
                )}
              </div>

              {post.replies.length > 0 && (
                <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
                  {post.replies.map((reply) => (
                    <div key={reply.id}>
                      <Byline post={reply} />
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {reply.body || <span className="italic">This reply was removed.</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === post.id && canPost && myAlias && (
                <div className="mt-4 border-l-2 border-primary/40 pl-4">
                  <PostComposer
                    alias={myAlias}
                    parentId={post.id}
                    maxLength={REPLY_MAX_LENGTH}
                    placeholder="Write a reply"
                    onPosted={(created) => appendReply(post.id, created)}
                  />
                </div>
              )}
            </div>
          ))}

          {cursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted/40 disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load older posts'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
