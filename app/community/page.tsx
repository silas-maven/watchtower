import { redirect } from 'next/navigation';

// The feed lives under /app, behind sign-in, so that nothing posted here is
// reachable to a crawler. This bare path predates the feed and pointed at the
// watchlists; anyone who kept the link now lands where they expected to.
export default function CommunityRedirect() {
  redirect('/app/community');
}
