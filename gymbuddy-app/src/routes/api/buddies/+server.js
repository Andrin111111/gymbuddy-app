// im Ergebnis für jeden Buddy:
const isSelf = buddy._id === userId;
const isFriend = (me.friends ?? []).includes(buddy._id);
const incoming = (me.friendRequestsIn ?? []).includes(buddy._id);
const outgoing = (me.friendRequestsOut ?? []).includes(buddy._id);

const relationship =
  isSelf ? "self"
  : isFriend ? "friend"
  : incoming ? "incoming"
  : outgoing ? "outgoing"
  : "none";
