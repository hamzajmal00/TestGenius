import { AttachFile } from '@mui/icons-material';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../context/SocketContext'; // <-- your context
import { CustomSelect } from './ChatTriggerButton';

/* ---------- UI helpers ---------- */
const OnlineDot = () => (
  <Box
    sx={{
      width: 12,
      height: 12,
      bgcolor: '#22c55e',
      borderRadius: '50%',
      border: '2px solid #fff',
      position: 'absolute',
      bottom: -1,
      right: -1,
    }}
  />
);
const UnreadBadge = ({ count }) =>
  count ? (
    <Badge
      badgeContent={count}
      sx={{
        '& .MuiBadge-badge': {
          bgcolor: '#ff8a00',
          color: '#fff',
          fontWeight: 700,
          minWidth: 18,
          height: 18,
        },
      }}
    />
  ) : null;
function FilePreview({ file }) {
  if (!file) return null;

  const { generatedUrl, metadata } = file;
  const contentType = metadata?.ContentType || '';
  const filename = metadata?.Metadata?.['x-amz-meta-filename'] || 'Attachment';

  if (contentType.startsWith('image/')) {
    // ✅ Show images inline
    return (
      <Box>
        <img
          src={generatedUrl}
          alt={filename}
          style={{ maxWidth: '200px', borderRadius: 8 }}
        />
        {/* <Typography variant='caption'>{filename}</Typography> */}
      </Box>
    );
  }

  if (contentType === 'application/pdf') {
    // ✅ Show PDF icon + link
    return (
      <Box
        component='a'
        href={generatedUrl}
        target='_blank'
        rel='noreferrer'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textDecoration: 'none',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '6px 10px',
          backgroundColor: '#F9FAFB',
          '&:hover': { backgroundColor: '#F3F4F6' },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: '#EF4444', // red PDF
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          PDF
        </Box>
        <Typography
          variant='body2'
          sx={{
            color: '#111827',
            textDecoration: 'underline',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 220,
          }}
        >
          {filename}
        </Typography>
      </Box>
    );
  }

  // ✅ Default: docx, xlsx, etc.
  return (
    <a
      href={generatedUrl}
      target='_blank'
      rel='noreferrer'
      style={{ textDecoration: 'underline', color: '#2563eb' }}
    >
      📄 {filename}
    </a>
  );
}
/* ---------- sidebar row ---------- */
function ConversationItem({
  id,
  avatarSrc,
  name,
  role,
  time,
  snippet,
  unread = 0,
  typing = false,
  online = false,
  active = false,
  onClick,
  User = {},
  isGroup = false,
  designation,
}) {
  return (
    <ListItemButton
      onClick={() => onClick?.(id)}
      sx={{
        px: 1.5,
        py: 1.5,
        borderRadius: 2,
        alignItems: 'center',
        bgcolor: active ? '#f3f4f6' : 'transparent',
        '&:hover': { bgcolor: active ? '#eef1f5' : '#f8fafb' },
      }}
    >
      <Box sx={{ position: 'relative', mr: 1.75 }}>
        {isGroup ? (
          <Box
            sx={{
              width: 44,
              height: 44,
              backgroundColor: '#E6E7EB',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={'/Group.svg'} alt='Group' />
          </Box>
        ) : (
          <Avatar
            src={User?.userProfile?.generatedUrl}
            sx={{ width: 44, height: 44 }}
          >
            {name?.[0]}
          </Avatar>
        )}

        {(online || User?.isUserOnline) && <OnlineDot />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' spacing={1}>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {isGroup ? User : name}
          </Typography>

          <Typography sx={{ fontSize: 12, color: '#6b7280', ml: 1 }}>
            {time}
          </Typography>
        </Stack>

        {(!!role || !!designation) && (
          <Typography sx={{ fontSize: 12, color: '#9aa0a6', mt: 0.25 }}>
            {role ? `(${role})` : ''}
            {role && designation ? ' • ' : ''}
            {designation}
          </Typography>
        )}
        <Stack direction={'row'} justifyContent={'space-between'} spacing={1}>
          <Typography
            noWrap
            sx={{
              mt: 0.25,
              fontSize: 13.5,
              color: typing ? '#f59e0b' : '#4b5563',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '50px !important',
            }}
          >
            {typing ? 'Typing........' : snippet || '—'}
          </Typography>

          <Box sx={{ mr: '20px !important' }}>
            <UnreadBadge count={unread} />
          </Box>
        </Stack>
      </Box>
    </ListItemButton>
  );
}
function ConversationsSidebar({ items = [], onSelect, activeId, onSearch }) {
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    onSearch?.(q);
  }, [q]); // lift search
  // ⬇️ pull the joiner from your socket context here
  const { joinThread, leaveThread } = useSocket() || {};
  const prevActiveRef = React.useRef(null);
  const navigate = useNavigate();
  console.log('itemsitems', items);

  const handleSelect = React.useCallback(
    (id) => {
      // (optional) leave previously joined room
      // if (prevActiveRef.current && prevActiveRef.current !== id) {
      //   leaveThread?.(Number(prevActiveRef.current));
      // }
      // JOIN the room as soon as a row is clicked
      joinThread?.(Number(id)); // <-- emits "join-room"
      prevActiveRef.current = id;
      onSelect?.(id); // keep existing parent flow
    },
    [joinThread, onSelect]
  );

  return (
    <Box
      sx={{
        width: 350,
        height: '100%',
        bgcolor: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        maxHeight: '100%',
        overflowY: 'auto',
      }}
    >
      <Box
        sx={{
          width: 350,
          position: 'absolute',
          top: 0,
        }}
      >
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 1.5,
          }}
        >
          <Stack direction='row' alignItems='center' spacing={1.25}>
            <IconButton size='small' onClick={() => navigate(-1)}>
              <ArrowBackIosNew fontSize='small' />
            </IconButton>
            <Typography
              sx={{
                color: 'var(--Black, #141414)',
                fontSize: '20px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '30px',
                flex: 1,
              }}
            >
              All Messages
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#9ca3af' }}>
              {new Date().toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Typography>
          </Stack>
          <Paper
            variant='outlined'
            sx={{
              mt: 2,
              px: 2,
              py: 1.5,
              borderColor: '#eee',
              bgcolor: '#f3f4f6',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <SearchIcon sx={{ color: '#9ca3af' }} />
            <InputBase
              placeholder='Search here'
              sx={{ fontSize: 16, width: '100%' }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Paper>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.25, pb: 2 }}>
          <List disablePadding>
            {items.length === 0 && q && (
              <Typography
                sx={{
                  color: '#6b7280',
                  textAlign: 'center',
                  mt: 4,
                  fontSize: 14,
                }}
              >
                No result found
              </Typography>
            )}
            {items.map((c) => {
              const isGroup = c?.Thread?.type === 'Group';
              const groupUsers = c?.Thread?.threadUsers
                ?.map((item) => `${item.User.firstName} ${item.User.lastName}`)
                .join(', ');
              return (
                <ConversationItem
                  key={c.id}
                  User={isGroup ? groupUsers : c?.Thread?.Messages[0]?.User}
                  {...c}
                  isGroup={isGroup}
                  active={c.id === activeId}
                  onClick={handleSelect}
                />
              );
            })}
          </List>
        </Box>
      </Box>
    </Box>
  );
}
function safeRoleFromLocalStorage() {
  try {
    const raw = (localStorage.getItem('role') || '').trim();
    // Treat "", "null", "undefined" as null
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    return raw;
  } catch {
    return null;
  }
}
const authToken = localStorage.getItem('authToken');

function AddMemberModal({ open, onClose, BASE_URL, token, threadId }) {
  const { sendGroupInvite } = useSocket();

  // single-select (fallback mode)
  const [rmOptions, setRmOptions] = useState([]);
  const [selectedRM, setSelectedRM] = useState(null);

  // dual-select (role mode)
  const [approverOptions, setApproverOptions] = useState([]);
  const [initiatorOptions, setInitiatorOptions] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [selectedInitiator, setSelectedInitiator] = useState(null);

  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const role = safeRoleFromLocalStorage(); // ← normalized

  // tiny helpers
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const mapToOption = (rec) => {
    const u = rec?.User || rec?.user || rec || {};
    const id = u?.id ?? rec?.id;
    if (!id) return null;
    const name =
      [u?.firstName, u?.lastName].filter(Boolean).join(' ') ||
      u?.email ||
      `User ${id}`;
    const avatar =
      u?.profile?.generatedUrl ||
      u?.profileImage?.generatedUrl ||
      u?.profilePicture?.generatedUrl ||
      '';
    return { id, name, avatar };
  };

  const extractRecords = (payload) => {
    const root = payload?.data ?? payload;
    return (
      (Array.isArray(root?.records) && root.records) ||
      (Array.isArray(root) && root) ||
      []
    );
  };

  // fetch when opened
  useEffect(() => {
    if (!open) return;

    // reset selections each open
    setSelectedRM(null);
    setSelectedApprover(null);
    setSelectedInitiator(null);

    let cancelled = false;
    (async () => {
      try {
        setFetching(true);

        if (role) {
          // Dual mode
          const [r1, r2] = await Promise.all([
            fetch(
              `${BASE_URL}/api/users/getSubUsersList/${encodeURIComponent(
                role
              )}/approver`,
              { headers: authHeaders }
            ),
            fetch(
              `${BASE_URL}/api/users/getSubUsersList/${encodeURIComponent(
                role
              )}/initiator`,
              { headers: authHeaders }
            ),
          ]);

          const j1 = await r1.json();
          const j2 = await r2.json();
          if (!r1.ok)
            throw new Error(j1?.message || 'Failed to load approvers');
          if (!r2.ok)
            throw new Error(j2?.message || 'Failed to load initiators');

          const approvers = extractRecords(j1).map(mapToOption).filter(Boolean);
          const initiators = extractRecords(j2)
            .map(mapToOption)
            .filter(Boolean);

          if (!cancelled) {
            setApproverOptions(approvers);
            setInitiatorOptions(initiators);
          }
        } else {
          // Single mode (fallback)
          const r = await fetch(
            `${BASE_URL}/api/chat/fetch/bankRelationship/initiator`,
            { headers: authHeaders }
          );
          const j = await r.json();
          if (!r.ok) throw new Error(j?.message || 'Failed to load members');
          const recs = extractRecords(j).map(mapToOption).filter(Boolean);
          if (!cancelled) setRmOptions(recs);
        }
      } catch (e) {
        if (!cancelled) toast.error(e.message || 'Failed to load members');
        if (!role) setRmOptions([]);
        else {
          setApproverOptions([]);
          setInitiatorOptions([]);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, BASE_URL, token, role]);

  const handleAdd = async () => {
    const chosen = role ? selectedApprover || selectedInitiator : selectedRM;
    if (!chosen) return;
    try {
      setLoading(true);
      await sendGroupInvite({ threadId, userId: chosen.id });
      toast.success('Invite sent.');
      onClose();
    } catch {
      toast.error('Could not send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ root: { sx: { zIndex: 100000 } } }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 0,
          width: 420,
          overflow: 'visible',
          zIndex: 10000,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: 16 }}>
        {role ? 'Select Member' : 'Select Initiator (Relationship Manager)'}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {role ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  mb: 2,
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#374151',
                }}
              >
                Approver
              </Typography>
              <CustomSelect
                value={selectedApprover}
                onChange={(v) => {
                  setSelectedApprover(v);
                  if (v) setSelectedInitiator(null);
                }}
                placeholder='Select Approver'
                disabled={!!selectedInitiator || fetching}
                options={approverOptions}
              />
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography
                sx={{
                  mb: 2,
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#374151',
                }}
              >
                Initiator
              </Typography>
              <CustomSelect
                value={selectedInitiator}
                onChange={(v) => {
                  setSelectedInitiator(v);
                  if (v) setSelectedApprover(null);
                }}
                placeholder='Select Initiator'
                disabled={!!selectedApprover || fetching}
                options={initiatorOptions}
              />
            </Box>
          </>
        ) : (
          <CustomSelect
            value={selectedRM}
            onChange={setSelectedRM}
            placeholder='Select Relationship Manager'
            disabled={fetching}
            options={rmOptions}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1.5 }}>
        <Button
          variant='contained'
          onClick={handleAdd}
          disabled={
            loading ||
            fetching ||
            (role ? !selectedApprover && !selectedInitiator : !selectedRM)
          }
          sx={{
            px: 2,
            py: 1.2,
            bgcolor: '#01E268',
            color: '#fff',
            textTransform: 'none',
            borderRadius: 1,
            fontWeight: 600,
            '&:hover': { bgcolor: '#059669' },
            '&:disabled': { bgcolor: '#d1d5db', color: '#9ca3af' },
          }}
        >
          Add
        </Button>
        <Button
          variant='outlined'
          onClick={onClose}
          sx={{
            px: 2,
            py: 1.2,
            borderColor: '#040A33',
            color: '#040A33',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: '#040A33', bgcolor: '#f9fafb' },
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ======================= PAGE ======================= */
export default function ConversationsPage() {
  const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
  const token = localStorage.getItem('authToken');
  const profile = useSelector((state) => state.profile);
  const [inviteOpen, setInviteOpen] = useState(false);

  const {
    connected,
    sendMessage,
    onNewMessage,
    joinThread,
    presence,
    requestPresence,
    isOnline,
    lastSeenOf,
    seedPresence, // ⬅️ add
    hintOnline, // ⬅️ add
    leaveThread,
  } = useSocket() || {};
  let lastDay = '';
  const [loadingThreads, setLoadingThreads] = React.useState(false);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [threads, setThreads] = React.useState([]); // mapped for sidebar
  const [rawIndex, setRawIndex] = React.useState({}); // id -> raw list row
  const [activeThreadId, setActiveThreadId] = React.useState(null);

  const [messages, setMessages] = React.useState([]); // right pane
  const [draft, setDraft] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const [activeReceiverId, setActiveReceiverId] = React.useState(null);
  const [userOnlineStatus, setUserStatus] = React.useState(false);

  const [params] = useSearchParams();
  const paramThreadId = params.get('threadId');
  const paramUserId = params.get('userId');

  const seenRef = React.useRef(new Set());

  const formatLastSeen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(+d)) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
    return d.toLocaleString();
  };

  const activeRow = React.useMemo(
    () => threads.find((t) => String(t.id) === String(activeThreadId)) || null,
    [threads, activeThreadId]
  );
  console.log(activeRow, 'activeRow');

  const groupPeople = activeRow?.Thread?.threadUsers
    ?.map((item) => `${item.User.firstName} ${item.User.lastName}`)
    .join(', ');

  const activeOtherId = activeRow?.otherId ?? null;
  const activeOnline =
    typeof isOnline === 'function'
      ? isOnline(activeOtherId)
      : !!presence?.[String(activeOtherId)]?.online;
  const activeLastSeen =
    typeof lastSeenOf === 'function'
      ? lastSeenOf(activeOtherId)
      : presence?.[String(activeOtherId)]?.lastSeen || null;

  // --- media utils
  const isImageLike = (mimeOrUrl = '') =>
    /^image\//.test(mimeOrUrl) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(String(mimeOrUrl));

  /** local cache so we can resolve our own uploads by key later */
  const useMediaCache = () => {
    const ref = React.useRef(new Map()); // key -> { url, name, type, size }
    const set = React.useCallback((key, meta) => {
      ref.current.set(String(key), meta);
    }, []);
    const get = React.useCallback((key) => ref.current.get(String(key)), []);
    return { set, get };
  };

  /** build a best-effort URL for a given key (uses cache, else guess a route) */
  const makeUrlForKey = (BASE_URL, cacheGet, key) => {
    const meta = cacheGet?.(key);
    if (meta?.url) return meta.url;
    // fallback – if your backend exposes a "get by key" route, adjust this
    return `${BASE_URL.replace(/\/$/, '')}/api/utils/file/${key}`;
  };

  const useUploadAttachment = (BASE_URL, token, mediaCacheSet) => {
    return React.useCallback(
      async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(
          `${BASE_URL.replace(/\/$/, '')}/api/utils/file/upload`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Upload failed');
        const key = json?.data?.key;
        const url = json?.data?.url?.generatedUrl || '';
        const S3File = json?.data?.url || '';
        mediaCacheSet(String(key), {
          url,
          name: file.name,
          type: file.type,
          size: file.size,
        });
        return { key, url, S3File };
      },
      [BASE_URL, token, mediaCacheSet]
    );
  };

  // 10s rolling window for duplicate suppression
  const DUPE_WINDOW_MS = 10_000;

  const makeSig = (threadId, senderId, text, createdAt) => {
    // second-level granularity is enough; include text & sender
    const t = new Date(createdAt || Date.now()).toISOString().slice(0, 19);
    return [
      String(threadId || ''),
      String(senderId || ''),
      text.trim(),
      t,
    ].join('|');
  };

  const useSeenSignatures = () => {
    const ref = React.useRef(new Map()); // sig -> ts

    const mark = React.useCallback((sig) => {
      const m = ref.current;
      const now = Date.now();
      m.set(sig, now);
      // prune old
      for (const [k, ts] of m) {
        if (now - ts > DUPE_WINDOW_MS) m.delete(k);
      }
    }, []);

    const has = React.useCallback((sig) => {
      const m = ref.current;
      const ts = m.get(sig);
      return ts != null && Date.now() - ts <= DUPE_WINDOW_MS;
    }, []);

    return { has, mark };
  };

  const { has: hasSig, mark: markSig } = useSeenSignatures();

  const normalizeSocketEvent = (raw, threadUsersForThread = []) => {
    const ev = Array.isArray(raw) ? raw[0] : raw;
    const msg = ev?.message ?? ev?.Message ?? ev;

    const threadId = String(
      msg?.threadId ?? msg?.thread_id ?? ev?.threadId ?? ev?.thread_id ?? ''
    );

    // media?
    // const maybeObj =  msg?.content  ? msg.content : null;
    const isMedia = msg?.type === 'media';
    const mediaId = msg?.content ? msg.content : null;

    const text = isMedia
      ? ''
      : typeof msg?.message === 'string'
      ? msg.message
      : msg?.content ?? msg?.message?.content ?? '';

    const srvId =
      String(
        msg?.messageId ??
          msg?.message_id ??
          msg?.id ??
          ev?.id ??
          ev?.messageId ??
          ''
      ) || null;
    const s = msg?.sender || msg?.User || ev?.User || null;
    const senderId =
      Number(
        s?.id ??
          msg?.senderId ??
          msg?.sender_id ??
          ev?.senderId ??
          ev?.sender_id ??
          null
      ) || null;
    const tempId = String(msg?.tempId ?? ev?.tempId ?? '');
    const createdAt =
      msg?.createdAt ??
      msg?.created_at ??
      ev?.createdAt ??
      new Date().toISOString();

    let user = normalizeUserMeta(s, { id: senderId });
    if (
      (!user.fullName || !user.avatar) &&
      Array.isArray(threadUsersForThread) &&
      senderId
    ) {
      const tu = threadUsersForThread.find(
        (tu) => Number(tu.userId ?? tu.id) === Number(senderId)
      );
      if (tu?.User)
        user = normalizeUserMeta(tu.User, { id: senderId, ...user });
    }

    return {
      threadId,
      text,
      srvId,
      tempId,
      senderId,
      createdAt,
      user,
      kind: isMedia ? 'media' : 'text',
      mediaId,
      previewUrl: msg?.file?.generatedUrl || null,
      file: msg?.file,
    };
  };

  const sameId = (a, b) => String(a ?? '') === String(b ?? '');

  // put near your other helpers (top of file)

  const resolveAvatarUrl = (u = {}) =>
    u.profile_image || // ← socket field
    u.profilePicture?.generatedUrl ||
    u.profile?.profilePicture?.generatedUrl ||
    u.avatarUrl ||
    u.avatar ||
    u.profileImage ||
    '';

  const normalizeUserMeta = (rawUser, fallback = {}) => {
    const u = rawUser || {};

    const id = Number(u.id ?? fallback.id ?? 0) || null;

    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(' ') ||
      u.fullName ||
      u.name ||
      fallback.fullName ||
      (u.email
        ? u.email
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : '') ||
      (id ? `User ${id}` : '');

    return {
      id,
      fullName,
      role: u.role || u.title || fallback.role || '',
      designation:
        u.designation || u.bankDesignation || fallback.designation || '',
      avatar: resolveAvatarUrl(u) || fallback.avatar || '',
      isBankMember: Boolean(u.isBankMember ?? fallback.isBankMember ?? false),
    };
  };

  const { set: mediaCacheSet, get: mediaCacheGet } = useMediaCache();
  const uploadAttachment = useUploadAttachment(BASE_URL, token, mediaCacheSet);
  const fileInputRef = React.useRef(null);

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // reset selection

    // File validation configuration
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    const ALLOWED_TYPES = {
      // Images
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],

      // Documents
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
    };

    // Validation functions
    const validateFile = (file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" exceeds the 5MB size limit.`);
        return false;
      }

      // Check file type
      if (!ALLOWED_TYPES[file.type]) {
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = Object.values(ALLOWED_TYPES)
          .flat()
          .map((ext) => ext.slice(1));

        toast.error(
          `File "${
            file.name
          }" has an unsupported format. Allowed formats: ${allowedExtensions
            .join(', ')
            .toUpperCase()}`
        );
        return false;
      }

      return true;
    };

    // Validate all files first
    const validFiles = files.filter(validateFile);

    // If no valid files, return early
    if (validFiles.length === 0) {
      return;
    }

    // Show success message for multiple valid files
    if (validFiles.length > 1) {
      toast.success(`${validFiles.length} files ready to upload`);
    }

    for (const file of validFiles) {
      if (!activeThreadId || !sendMessage) continue;

      // optimistic bubble
      const tempId = `file_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const objectUrl = URL.createObjectURL(file);
      const { S3File } = await uploadAttachment(file);
      upsertMessage({
        id: tempId,
        tempId,
        text: '',
        file: S3File,
        kind: 'media',
        mediaId: null,
        ts: new Date(),
        time: formatTime(new Date()),
        mine: true,
        senderId: currentUserId,
        user: normalizeUserMeta({
          id: currentUserId,
          firstName: profile?.firstName,
          lastName: profile?.lastName,
        }),
        threadId: Number(activeThreadId),
        pending: true,
        // store preview url & meta so renderer can use them
        previewUrl: objectUrl,
        fileName: file.name,
        mime: file.type,
      });

      try {
        const { key, url, S3File } = await uploadAttachment(file);

        // finalize optimistic bubble
        upsertMessage({
          id: tempId, // upsert by tempId
          tempId,
          file: S3File,
          text: '',
          kind: 'media',
          mediaId: key,
          ts: new Date(),
          time: formatTime(new Date()),
          mine: true,
          senderId: currentUserId,
          user: normalizeUserMeta({ id: currentUserId }),
          threadId: Number(activeThreadId),
          pending: false,
          previewUrl: url,
          fileName: file.name,
          mime: file.type,
        });

        // send socket payload (type media + id)
        sendMessage(
          {
            threadId: Number(activeThreadId),
            receiverId: null, // your server derives from thread
            message: key,
            type: 'media',
            tempId,
          },
          () => {}
        );

        // Show success toast for individual file upload
        toast.success(`"${file.name}" uploaded successfully!`);
      } catch (err) {
        // mark error state on the optimistic bubble
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId
              ? { ...m, pending: false, error: 'Upload failed' }
              : m
          )
        );

        // Show error toast
        toast.error(`Failed to upload "${file.name}". Please try again.`);
      }
    }
  };

  // human time for the header
  const formatHeaderTime = (d) =>
    d.toLocaleString([], {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

  // same minute?
  const isSameMinuteGroup = (a, b) =>
    a.senderId === b.senderId && Math.abs(a.ts - b.ts) <= 60 * 1000;

  // If you have current user id, set it to mark "mine" bubbles
  const currentUserId = profile?.id || null;

  const messagesViewportRef = React.useRef(null);
  const bottomRef = React.useRef(null);

  const scrollToBottom = React.useCallback((behavior = 'auto') => {
    // Prefer a sentinel for reliable scroll
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      return;
    }
    // Fallback: manual scroll
    const el = messagesViewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const normalizeDetail = (json) => {
    const isUserOnline = json?.data?.isOnline || false;

    const d = json?.data?.threadDetail;
    if (Array.isArray(d)) return { rawMsgs: d, threadUsers: [], isUserOnline };
    if (Array.isArray(d?.Messages))
      return {
        rawMsgs: d.Messages,
        threadUsers: d?.ThreadUsers || d?.Thread?.ThreadUsers || [],
        isUserOnline,
      };
    if (Array.isArray(d?.Thread?.Messages))
      return {
        rawMsgs: d.Thread.Messages,
        threadUsers: d?.Thread?.ThreadUsers || [],
        isUserOnline,
      };
    if (d && typeof d === 'object' && (d.content || d.message))
      return { rawMsgs: [d], threadUsers: [], isUserOnline };
    return { rawMsgs: [], threadUsers: [], isUserOnline };
  };

  const upsertMessage = React.useCallback((incoming) => {
    const srvId = incoming?.id != null ? String(incoming.id) : null;
    const tempId = incoming?.tempId ?? null;

    // if we've already seen this server id, ignore
    if (srvId && seenRef.current.has(`id:${srvId}`)) return;

    setMessages((prev) => {
      // If this is the server echo for our optimistic message, replace it
      if (tempId) {
        const idx = prev.findIndex((m) => m.tempId === tempId);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...incoming, pending: false };
          if (srvId) seenRef.current.add(`id:${srvId}`);
          seenRef.current.add(`temp:${tempId}`);
          return copy;
        }
      }

      // If we already appended the same temp locally, skip
      if (tempId && seenRef.current.has(`temp:${tempId}`)) return prev;

      // Normal append
      const next = [...prev, incoming];
      if (srvId) seenRef.current.add(`id:${srvId}`);
      if (tempId) seenRef.current.add(`temp:${tempId}`);
      return next;
    });
  }, []);

  const deriveReceiverId = (rawMsgs, listRowThreadUsers, currentUserId) => {
    // 1) last non-me message’s senderId
    const lastOther = [...rawMsgs]
      .reverse()
      .find(
        (m) =>
          m?.senderId &&
          (!currentUserId || Number(m.senderId) !== Number(currentUserId))
      );
    if (lastOther?.senderId) return Number(lastOther.senderId);

    // 2) fallback: any participant from list that isn't me
    const ids = (listRowThreadUsers || [])
      .map((tu) => Number(tu.userId ?? tu.id))
      .filter(Boolean);
    const other = ids.find(
      (uid) => !currentUserId || Number(uid) !== Number(currentUserId)
    );
    return other ?? null;
  };

  // replace your mapMsgs with this signature
  const mapMsgs = (
    rawMsgs,
    threadId,
    currentUserId,
    formatTime,
    listThreadUsers = []
  ) =>
    rawMsgs
      .sort(
        (a, b) =>
          new Date(a.createdAt ?? a.updatedAt ?? 0) -
          new Date(b.createdAt ?? b.updatedAt ?? 0)
      )
      .map((m, i) => {
        const isMedia =
          m?.type === 'media' ||
          (typeof m?.message === 'object' && m?.message?.type === 'media');
        const mediaId = m?.content ? m?.content : null;

        const text = isMedia
          ? ''
          : typeof m.content === 'string'
          ? m.content
          : typeof m.message === 'string'
          ? m.message
          : m?.message?.content ?? '';

        const ts = new Date(m.createdAt ?? m.updatedAt ?? Date.now());
        const senderId = Number(m.senderId ?? m.sender_id ?? 0) || null;

        let user = normalizeUserMeta(m.User, { id: senderId });
        if ((!user.fullName || !user.avatar) && listThreadUsers?.length) {
          const tu = listThreadUsers.find(
            (tu) => Number(tu.userId ?? tu.id) === Number(senderId)
          );
          if (tu?.User)
            user = normalizeUserMeta(tu.User, { id: senderId, ...user });
        }

        return {
          id: String(m.id ?? `${threadId}-${i}`),
          text,
          kind: isMedia ? 'media' : 'text',
          mediaId: isMedia ? mediaId : null,
          ts,
          time: formatTime(ts),
          mine: currentUserId
            ? Number(senderId) === Number(currentUserId)
            : false,
          senderId,
          user,
          threadId: Number(m.threadId ?? threadId),
          previewUrl: isMedia ? m.file?.generatedUrl : null,
          file: m?.file,
        };
      });

  const formatTime = (isoOrDate) => {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return isNaN(+d)
      ? ''
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* ---------- Fetch thread list ---------- */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingThreads(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}/api/chat/fetchThreads`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || 'Failed to fetch threads');

        const rows = Array.isArray(json?.data) ? json.data : [];
        const idToRaw = {};
        const mapped = rows.map((row) => {
          const t = row.Thread || row;
          const threadId = String(t.id ?? row.threadId ?? row.id);

          const msgs = Array.isArray(t.Messages) ? t.Messages : [];
          const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;

          const selfId = Number(row.userId ?? currentUserId ?? 0);
          const createdBy = Number(t.createdBy ?? 0);

          // ✅ choose real "other user" (User.id), NEVER message id
          let otherId = null;
          if (createdBy && createdBy !== selfId) {
            otherId = createdBy;
          } else if (lastMsg?.senderId && Number(lastMsg.senderId) !== selfId) {
            otherId = Number(lastMsg.senderId);
          }

          // display name (fallback to lastMsg.User)
          const otherName =
            (lastMsg?.User
              ? [lastMsg.User.firstName, lastMsg.User.lastName]
                  .filter(Boolean)
                  .join(' ')
              : '') || (otherId ? `User ${otherId}` : `Thread #${threadId}`);

          const lastText =
            typeof lastMsg?.content === 'string'
              ? lastMsg.content
              : typeof lastMsg?.message === 'string'
              ? lastMsg.message
              : lastMsg?.message?.content ?? '—';

          const timeIso =
            lastMsg?.createdAt ??
            t.updatedAt ??
            row.updatedAt ??
            t.createdAt ??
            row.createdAt;

          // Find the actual User object for 'otherId'
          const threadUsers = t.threadUsers || t.ThreadUsers || [];
          const otherUserObj = threadUsers.find(
            (tu) => Number(tu.userId ?? tu.id) === Number(otherId)
          )?.User;

          // Fallback: if we didn't find them in the list, maybe lastMsg.User is them?
          const targetUser =
            otherUserObj ||
            (Number(lastMsg?.senderId) === Number(otherId)
              ? lastMsg?.User
              : null) ||
            {};

          const normalizedTarget = normalizeUserMeta(targetUser);

          return {
            ...row,
            id: threadId,
            name: normalizedTarget.fullName || otherName,
            role: normalizedTarget.role,
            designation: normalizedTarget.designation,
            time: formatTime(timeIso),
            snippet: lastText,
            unread: Number(row.unreadCount ?? row.unread ?? 0),
            avatarSrc: normalizedTarget.avatar,
            otherId, // 👈 this is the key your presence uses
          };
        });

        setThreads(mapped);

        // seed + snapshot (only valid numeric ids)
        try {
          const ids = [
            ...new Set(
              mapped
                .map((t) => t.otherId)
                .filter((id) => typeof id === 'number' && id > 0)
            ),
          ];
          if (ids.length) {
            seedPresence?.(ids);
            requestPresence?.(ids);
          }
        } catch {}

        setRawIndex(idToRaw);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error');
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // once

  // keep formatTime, BASE_URL, token, currentUserId as you already have

  const fetchThreadMessages = React.useCallback(
    async (threadId) => {
      const res = await fetch(
        `${BASE_URL}/api/chat/fetchThreadDetail/${threadId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to fetch thread');
      return json;
    },
    [BASE_URL, token]
  );

  const handleOpenThread = React.useCallback(
    async (id) => {
      console.log('handleOpenThread', id);
      setActiveThreadId(id);
      setLoadingMsgs(true);
      setError(null);

      try {
        // optional: join socket room
        // if (typeof joinThread === 'function') {
        //   try {
        //     joinThread(Number(id));
        //   } catch {}
        // }

        const json = await fetchThreadMessages(id);
        const { rawMsgs, isUserOnline } = normalizeDetail(json);
        setUserStatus(isUserOnline);
        // list fallback participants (from the sidebar list row)
        const listRow = rawIndex[String(id)];
        const listThreadUsers =
          listRow?.Thread?.ThreadUsers || listRow?.ThreadUsers || [];
        // compute receiver
        const receiver = deriveReceiverId(
          rawMsgs,
          listThreadUsers,
          currentUserId
        );
        // setActiveReceiverId(receiver ?? null);

        // map messages

        const msgs = mapMsgs(
          rawMsgs,
          id,
          currentUserId,
          formatTime,
          listThreadUsers
        );
        setMessages(msgs);
        requestAnimationFrame(() => scrollToBottom('auto'));

        // clear unread & refresh preview
        const lastText = msgs.at(-1)?.text;
        setThreads((prev) =>
          prev.map((t) =>
            t.id === String(id)
              ? { ...t, unread: 0, snippet: lastText ?? t.snippet }
              : t
          )
        );
      } catch (e) {
        setError(e.message || 'Error');
        setMessages([]);
        setActiveReceiverId(null);
      } finally {
        setLoadingMsgs(false);
      }
    },
    [fetchThreadMessages, rawIndex, joinThread, currentUserId]
  );

  // --- open-by-id: reuse your existing handler
  const openThreadById = React.useCallback(
    async (tid) => handleOpenThread(String(tid)),
    [handleOpenThread]
  );

  const latestThreadIdRef = React.useRef(activeThreadId);

  useEffect(() => {
    latestThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    return () => {
      if (latestThreadIdRef.current) {
        leaveThread(Number(latestThreadIdRef.current));
      }
    };
  }, []);

  // --- check if a thread exists for a user
  const checkThreadAlreadyCreated = React.useCallback(
    async (userId) => {
      const res = await fetch(
        `${BASE_URL}/api/chat/checkThreadAlreadyCreated/${userId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      let json = null;
      try {
        json = await res.json();
      } catch {}
      if (!res.ok) throw new Error(json?.message || 'Check thread failed');

      return (
        json?.data?.threadId ??
        json?.data?.id ??
        (typeof json?.data === 'string' || typeof json?.data === 'number'
          ? json.data
          : null) ??
        json?.threadId ??
        null
      );
    },
    [BASE_URL, token]
  );

  // --- create a thread for a user and return its id
  const createThreadFor = React.useCallback(
    async (userId) => {
      const res = await fetch(`${BASE_URL}/api/chat/createThread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Create thread failed');
      return json?.data?.id ?? json?.data?.threadId ?? json?.threadId ?? null;
    },
    [BASE_URL, token]
  );

  // re-derive avatarSrc & otherId once currentUserId is known
  React.useEffect(() => {
    if (!currentUserId || !Object.keys(rawIndex || {}).length) return;

    setThreads((prev) =>
      prev.map((t) => {
        const row = rawIndex[String(t.id)] || {};
        const thread = row.Thread || row.Thread?.Thread || row;
        const tus = thread?.ThreadUsers || row.ThreadUsers || [];

        const otherTU = tus.find(
          (tu) => Number(tu.userId ?? tu.id) !== Number(currentUserId)
        );
        const otherUser = otherTU?.User || null;
        const otherMeta = otherUser ? normalizeUserMeta(otherUser) : null;

        return {
          ...t,
          otherId:
            Number(otherTU?.userId ?? otherTU?.id ?? t.otherId) || t.otherId,
          avatarSrc: otherMeta?.avatar || t.avatarSrc,
          name: t.name || otherMeta?.fullName || t.name,
        };
      })
    );
  }, [currentUserId, rawIndex]);

  /* ---------- Socket: incoming messages ---------- */
  React.useEffect(() => {
    if (!onNewMessage) return;

    // stable handler so off() removes the same one
    const handler = (raw) => {
      const ev = Array.isArray(raw) ? raw[0] : raw;
      const guessedThreadId =
        String(
          ev?.message?.threadId ??
            ev?.message?.thread_id ??
            ev?.threadId ??
            ev?.thread_id ??
            ''
        ) || String(activeThreadId || '');
      const row =
        rawIndex[guessedThreadId] || rawIndex[String(activeThreadId)] || {};
      const threadUsers = row?.Thread?.ThreadUsers || row?.ThreadUsers || [];

      // const { threadId, text, srvId, tempId, senderId, createdAt, user } =
      //   normalizeSocketEvent(raw, threadUsers);

      // if (!text) return;
      const {
        threadId,
        text,
        srvId,
        tempId,
        senderId,
        createdAt,
        user,
        kind,
        mediaId,
        previewUrl,
        file,
      } = normalizeSocketEvent(raw, threadUsers);
      if (srvId && seenRef.current.has(`id:${srvId}`)) {
        console.log('Ignoring duplicate server message:', srvId);
        return;
      }

      // hard de-dup by server id / temp id
      if (srvId && seenRef.current.has(`id:${srvId}`)) return;
      if (tempId && seenRef.current.has(`temp:${tempId}`)) return;

      const isOpen =
        activeThreadId && String(threadId) === String(activeThreadId);

      // signature-based suppression (works with no id/tempId)
      const label =
        text && text.trim() ? text : kind === 'media' ? '📎 Attachment' : '';
      const sig = makeSig(threadId, senderId, label, createdAt);
      if (hasSig(sig)) {
        // already seen this content in the recent window
        return;
      }

      // not open → update preview/unread and record signature
      if (!isOpen) {
        markSig(sig);
        setThreads((prev) =>
          prev.map((t) =>
            String(t.id) === String(threadId)
              ? {
                  ...t,
                  snippet: label,
                  unread: (t.unread || 0) + 1,
                  time: formatTime(createdAt),
                }
              : t
          )
        );
        return;
      }

      // 1) replace optimistic via tempId
      let replaced = false;
      setMessages((prev) => {
        if (tempId) {
          const idx = prev.findIndex((m) => m.tempId === tempId);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              id: srvId || copy[idx].id,
              pending: false,
              time: formatTime(createdAt),
            };
            if (srvId) seenRef.current.add(`id:${srvId}`);
            seenRef.current.add(`temp:${tempId}`);
            markSig(sig);
            replaced = true;
            return copy;
          }
        }
        return prev;
      });
      if (replaced) return;

      // 2) replace last pending mine with same text (server sent id but not tempId)
      if (srvId) {
        let replacedById = false;
        setMessages((prev) => {
          const rIdxFromEnd = [...prev]
            .reverse()
            .findIndex((m) => m.pending && m.mine && m.text === text);
          if (rIdxFromEnd !== -1) {
            const i = prev.length - 1 - rIdxFromEnd;
            const copy = [...prev];
            copy[i] = {
              ...copy[i],
              id: srvId,
              pending: false,
              time: formatTime(createdAt),
            };
            seenRef.current.add(`id:${srvId}`);
            markSig(sig);
            replacedById = true;
            return copy;
          }
          return prev;
        });
        if (replacedById) return;
      }

      // 3) silent-echo guard (mine + same text within window)
      const isMine =
        currentUserId != null &&
        senderId != null &&
        Number(senderId) === Number(currentUserId);

      if (isMine) {
        let handledEcho = false;
        setMessages((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];

          if (last.mine && last.pending && last.text === text) {
            const copy = [...prev];
            copy[copy.length - 1] = {
              ...last,
              id: srvId || last.id,
              pending: false,
              time: formatTime(createdAt),
            };
            if (srvId) seenRef.current.add(`id:${srvId}`);
            markSig(sig);
            handledEcho = true;
            return copy;
          }

          return prev;
        });
        if (handledEcho) return;
      }

      // 4) normal append
      markSig(sig);
      upsertMessage({
        id: srvId || `${Date.now()}`,
        tempId: tempId || undefined,
        text, // '' for media is fine
        kind, // 'media' | 'text'
        mediaId, // key like "1756…"
        previewUrl, // signed URL from server (msg.file.generatedUrl)
        ts: new Date(createdAt || Date.now()),
        time: formatTime(createdAt || new Date()),
        mine: isMine,
        senderId,
        user,
        threadId: Number(activeThreadId),
        pending: false,
        file,
      });
      // ⬅️ sender ne abhi activity dikhai → optimistically online for 60s
      if (!isMine && senderId) {
        try {
          hintOnline?.(senderId, 60_000);
        } catch {}
      }
    };

    // subscribe and clean up the exact same handler
    const off = onNewMessage(handler);
    return () => off && off();
  }, [
    onNewMessage,
    activeThreadId,
    currentUserId,
    upsertMessage,
    rawIndex,
    hasSig,
    markSig,
  ]);

  React.useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  // Open the correct chat based on URL (or last cached)
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) If threadId present, open it directly
      if (paramThreadId) {
        await openThreadById(paramThreadId);
        return;
      }

      // 2) Else if userId present, resolve/create then open
      if (paramUserId) {
        try {
          const existing = await checkThreadAlreadyCreated(paramUserId);
          const tid = existing ?? (await createThreadFor(paramUserId));
          if (!cancelled && tid) await openThreadById(tid);
          // persist for refresh UX
          localStorage.setItem(
            'lastChat',
            JSON.stringify({ threadId: tid, userId: Number(paramUserId) })
          );
          return;
        } catch (e) {
          console.error('[paramUserId] open failed:', e);
        }
      }

      // 3) Fallback: last opened chat from localStorage
      const cached = (() => {
        try {
          return JSON.parse(localStorage.getItem('lastChat') || 'null');
        } catch {
          return null;
        }
      })();

      if (cached?.threadId) {
        await openThreadById(cached.threadId);
        return;
      }

      if (cached?.userId) {
        try {
          const existing = await checkThreadAlreadyCreated(cached.userId);
          const tid = existing ?? (await createThreadFor(cached.userId));
          if (!cancelled && tid) await openThreadById(tid);
          return;
        } catch (e) {
          console.error('[cached user] open failed:', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    paramThreadId,
    paramUserId,
    openThreadById,
    checkThreadAlreadyCreated,
    createThreadFor,
  ]);
  const chatSenderData = JSON.parse(localStorage.getItem('chatData'));

  /* ---------- Send message (socket) ---------- */
  const handleSend = () => {
    const text = draft.trim();
    if (!text || !activeThreadId || !sendMessage) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // mark the optimistic signature so a “silent echo” won’t double-append
    const optimisticSig = makeSig(
      activeThreadId,
      currentUserId,
      text,
      new Date()
    );
    markSig(optimisticSig);

    // optimistic message
    const optimistic = {
      id: tempId,
      tempId,
      text,
      ts: new Date(),
      time: formatTime(new Date()),
      mine: true,
      senderId: currentUserId,
      user: {
        id: currentUserId,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        fullName: profile?.profile?.fullName || chatSenderData?.fullName,
        avatar:
          profile?.profile?.profilePicture?.generatedUrl ||
          chatSenderData?.profilePicture ||
          '',
        role: `${profile?.role || ''} ${
          profile?.subUserRole || chatSenderData?.Designation || ''
        }`,
      },
      threadId: Number(activeThreadId),
      pending: true,
    };

    // mark temp as seen and show it
    seenRef.current.add(`temp:${tempId}`);
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');

    // send with tempId so server can echo it back
    sendMessage(
      {
        threadId: Number(activeThreadId),
        receiverId: null,
        message: text,
        tempId,
      },
      (ack) => {
        // optional: if server ACKs immediately with { id, createdAt, tempId }
        if (ack?.id) {
          upsertMessage({
            id: String(ack.id),
            tempId, // still pass so we replace the optimistic one
            text,
            time: formatTime(ack.createdAt || new Date()),
            mine: true,
            senderId: currentUserId,
            threadId: Number(activeThreadId),
            pending: false,
          });
        }
      }
    );
  };

  /* ---------- Search filter ---------- */
  const filteredThreads = React.useMemo(() => {
    if (!searchText) return threads;
    const q = searchText.toLowerCase();
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.snippet || '').toLowerCase().includes(q)
    );
  }, [threads, searchText]);

  /* ---------- Active thread ---------- */
  const active = threads.find((t) => t.id === activeThreadId);

  // Turn flat messages into grouped blocks by sender minute
  const grouped = () => {
    const out = [];
    let current = null;

    for (const m of messages) {
      if (!current || !isSameMinuteGroup(current.last, m)) {
        // start a new group
        current = {
          key: `${m.senderId}-${m.ts.toISOString().slice(0, 16)}-${m.id}`,
          senderId: m.senderId,
          mine: m.mine,
          user: m.user,
          headerTime: m.ts,
          items: [m],
          last: m,
        };
        out.push(current);
      } else {
        current.items.push(m);
        current.last = m;
      }
    }
    return out;
  };

  React.useEffect(() => {
    if (!activeOtherId || !requestPresence) return;
    requestPresence([activeOtherId]);
  }, [activeOtherId, requestPresence]);

  React.useEffect(() => {
    if (!requestPresence) return;
    const ids = [...new Set(threads.map((t) => t.otherId).filter(Boolean))];
    if (!ids.length) return;

    // immediate refresh
    requestPresence(ids);

    // poll har 30s
    const int = setInterval(() => requestPresence(ids), 30_000);
    return () => clearInterval(int);
  }, [threads, requestPresence]);
  React.useEffect(() => {
    if (!connected || !requestPresence) return;
    const ids = [...new Set(threads.map((t) => t.otherId).filter(Boolean))];
    if (ids.length) requestPresence(ids);
  }, [connected, threads, requestPresence]);

  return (
    <Box
      sx={{
        mt: 3,
        width: '100%',
        height: '81vh',
        background: '#fff',
        color: '#111827',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '350px 1fr',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Sidebar */}
        <ConversationsSidebar
          items={filteredThreads.map((t) => ({
            ...t,
            online:
              typeof isOnline === 'function'
                ? isOnline(t.otherId)
                : !!presence?.[String(t.otherId)]?.online,
          }))}
          activeId={activeThreadId}
          onSelect={handleOpenThread}
          onSearch={setSearchText}
        />

        {/* Right Pane */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            px: 2,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              width: '100%',
            }}
          >
            {/* Header */}
            {messages.length !== 0 && (
              <Box
                sx={{
                  px: 2,
                  py: 2,
                  bgcolor: '#ffffff',
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  minHeight: 72,
                }}
              >
                <Stack direction='row' alignItems='center' spacing={1.5}>
                  {activeRow?.Thread?.type === 'Group' ? (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          backgroundColor: '#E6E7EB',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img src={'/Group.svg'} alt='Group' />
                      </Box>
                      <Typography
                        sx={{
                          color: 'var(--colors-text-text-primary-900, #181D27)',
                          fontSize: '18px',
                          fontWeight: 600,
                          lineHeight: '28px',
                        }}
                      >
                        {groupPeople ? groupPeople : '—'}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar
                          src={activeRow?.avatarSrc || ''}
                          sx={{
                            color:
                              'var(--colors-text-text-primary-900, #181D27)',
                            fontSize: '18px',
                            fontWeight: 600,
                          }}
                        >
                          {(active?.name || ' ')[0]}
                        </Avatar>
                        {(userOnlineStatus
                          ? userOnlineStatus
                          : activeOnline) && <OnlineDot />}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography
                          sx={{
                            color:
                              'var(--colors-text-text-primary-900, #181D27)',
                            fontSize: '18px',
                            fontWeight: 600,
                            lineHeight: '28px',
                          }}
                        >
                          {active ? active.name : '—'}
                        </Typography>

                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          {(active?.role || active?.designation) && (
                            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                              {active?.role || ''}
                              {active?.role && active?.designation ? ' • ' : ''}
                              {active?.designation || ''}
                            </Typography>
                          )}

                          {/* <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: (activeOnline || userOnlineStatus)
                                ? '#01E268'
                                : '#9ca3af',
                            }}
                          /> */}

                          <Typography
                            sx={{
                              fontSize: 12,
                              color: (activeOnline || userOnlineStatus)
                                ? '#01E268'
                                : '#9ca3af',
                            }}
                          >
                            {(activeOnline || userOnlineStatus)
                              ? 'Online'
                              : activeLastSeen
                              ? `Last seen ${formatLastSeen(activeLastSeen)}`
                              : 'Offline'}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}

                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ marginRight: '30px !important' }}>
                    <Button
                      startIcon={<PeopleAltOutlinedIcon />}
                      variant='outlined'
                      size='small'
                      onClick={() => setInviteOpen(true)}
                      sx={{
                        textTransform: 'none',
                        borderColor: '#e5e7eb',
                        color: '#374151',
                        borderRadius: 3,
                      }}
                    >
                      People
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
          {/* Empty state */}
          {!activeThreadId && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f3f4f6',
                borderRadius: 2,
                m: 2,
              }}
            >
              <Stack spacing={2} alignItems='center'>
                <Box
                  sx={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    bgcolor: '#10b981',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <ForumOutlined sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography sx={{ color: '#6b7280' }}>
                  No chat selected. Click on a chat from the list to start
                  viewing conversations
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Messages */}
          {activeThreadId && (
            <>
              <Box
                ref={messagesViewportRef}
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2.5,
                  maxHeight: '550px',
                  pb: 5,
                  position: 'relative',
                  // zIndex: 8,
                }}
              >
                {(loadingThreads || loadingMsgs) && (
                  <Typography sx={{ color: '#6b7280' }}>Loading…</Typography>
                )}
                {error && <Typography color='error'>{error}</Typography>}

                {!error && (
                  <Stack spacing={3}>
                    <Chip
                      label={new Date().toLocaleDateString(undefined, {
                        weekday: 'long',
                      })}
                      size='small'
                      sx={{
                        alignSelf: 'center',
                        bgcolor: '#f3f4f6',
                        color: '#6b7280',
                        height: 24,
                      }}
                    />

                    {grouped().length === 0 && !loadingMsgs && (
                      <Typography sx={{ color: '#9ca3af' }}>
                        No messages yet.
                      </Typography>
                    )}

                    {grouped().map((g, idx) => {
                      const day =
                        g.day ??
                        new Date(g.headerTime).toLocaleDateString(undefined, {
                          weekday: 'long',
                        });

                      const showDay = day !== lastDay;
                      lastDay = day;

                      return (
                        <React.Fragment key={g.key}>
                          {showDay && (
                            <Box sx={{ textAlign: 'center', my: 1.5 }}>
                              <Chip
                                label={day}
                                size='small'
                                sx={{
                                  bgcolor: '#f3f4f6',
                                  color: '#6b7280',
                                  fontSize: 12,
                                  mt: 10,
                                }}
                              />
                            </Box>
                          )}

                          <Stack
                            alignItems={g.mine ? 'flex-end' : 'flex-start'}
                            spacing={1.25}
                            sx={{
                              ...(idx === grouped().length - 1 && {
                                marginBottom: '100px !important',
                              }),
                            }}
                          >
                            {/* Header row once per group */}
                            <Stack
                              direction='row'
                              spacing={1}
                              sx={{ alignItems: 'center', maxWidth: 640 }}
                            >
                              <Avatar
                                src={
                                  g.user.avatar?.generatedUrl || g.user.avatar
                                }
                                sx={{ width: 36, height: 36, flexShrink: 0 }}
                              >
                                {(g.user.fullName || ' ')[0]}
                              </Avatar>

                              <Stack
                                sx={{
                                  minWidth: 0,
                                  // textAlign: g.mine ? 'right' : 'left',
                                }}
                              >
                                <Stack
                                  direction='column'
                                  // spacing={1}
                                  // alignItems='center'
                                  justifyContent={
                                    g.mine ? 'flex-end' : 'flex-start'
                                  }
                                >
                                  <Typography
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: 14,
                                      color: '#111827',
                                    }}
                                  >
                                    {g.user.fullName ||
                                      `User ${g.senderId ?? ''}`}
                                  </Typography>

                                  {g.user.role || g.user.designation ? (
                                    <Typography
                                      sx={{ fontSize: 12, color: '#6b7280' }}
                                    >
                                      ({g.user.role}
                                      {g.user.isBankMember && g.user.designation
                                        ? ` — ${g.user.designation}`
                                        : ''}
                                      )
                                    </Typography>
                                  ) : (
                                    <Typography
                                      sx={{ fontSize: 12, color: '#6b7280' }}
                                    >
                                      you
                                    </Typography>
                                  )}

                                  {/* <Typography
                                      sx={{
                                        fontSize: 12,
                                        color: '#9ca3af',
                                        ml: 1,
                                      }}
                                    >
                                      {formatHeaderTime(g.headerTime)}
                                    </Typography> */}
                                </Stack>
                              </Stack>
                            </Stack>

                            {/* Group bubbles */}
                            <Stack
                              spacing={1}
                              alignItems={g.mine ? 'end' : 'start'}
                            >
                              {g.items
                                .filter(
                                  (item, idx, arr) =>
                                    arr.findIndex((i) => i.id === item.id) ===
                                    idx
                                )
                                .map((m) => (
                                  <Paper
                                    key={m.id}
                                    elevation={0}
                                    sx={{
                                      px: 2,
                                      py: 1.2,
                                      // pb: 2,
                                      // pr: 7,
                                      maxWidth: { xs: '85%', sm: 520 },
                                      width: 'fit-content',
                                      bgcolor: g.mine ? '#01E268' : '#ffffff',
                                      color: g.mine ? '#ecfdf5' : '#111827',
                                      borderRadius: g.mine
                                        ? '14px 14px 4px 14px'
                                        : '14px 14px 14px 4px',
                                      border: g.mine
                                        ? 'none'
                                        : '1px solid #e5e7eb',
                                      position: 'relative',

                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 1,
                                      alignItems: g.mine ? 'end ' : 'start',
                                    }}
                                  >
                                    {m.kind === 'media' ? (
                                      <FilePreview file={m.file} />
                                    ) : (
                                      <Typography
                                        sx={{
                                          fontSize: 13.5,
                                          lineHeight: 1.4,
                                          whiteSpace: 'pre-wrap',
                                          overflowWrap: 'anywhere',
                                          wordBreak: 'break-word',
                                          hyphens: 'auto',
                                        }}
                                      >
                                        {m.text}
                                      </Typography>
                                    )}

                                    <Typography
                                      sx={{
                                        // position: 'absolute',
                                        // right: 8,
                                        // bottom: 4,
                                        fontSize: 10.5,
                                        color: g.mine ? '#ecfdf5' : '#9ca3af',
                                      }}
                                    >
                                      {m.time}
                                    </Typography>
                                  </Paper>
                                ))}
                            </Stack>
                          </Stack>
                        </React.Fragment>
                      );
                    })}

                    {/* scroll sentinel */}
                    <div ref={bottomRef} />
                  </Stack>
                )}
              </Box>

              {/* Composer */}
              <Box
                sx={{
                  p: 2,
                  borderTop: '1px solid #e5e7eb',
                  bgcolor: '#ffffff',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    position: 'relative',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    bgcolor: 'white',
                  }}
                >
                  <InputBase
                    multiline
                    placeholder='Type your message here ...'
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
                        handleSend();
                    }}
                    sx={{
                      p: 1.5,
                      pr: 16, // leaves space for the buttons
                      fontSize: 14,
                      minHeight: 88, // textarea look
                      borderRadius: '12px',
                      bgcolor: '#fff',
                      width: '100%',
                      alignItems: 'baseline !important',
                    }}
                  />

                  {/* Actions docked bottom-right */}
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 8,
                      bottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: '#94a3b8',
                    }}
                  >
                    {/* <IconButton
                      size='small'
                      sx={{ color: 'inherit', '&:hover': { color: '#64748b' } }}
                    >
                      <Add fontSize='small' />
                    </IconButton> */}

                    <IconButton
                      size='small'
                      sx={{ color: 'inherit', '&:hover': { color: '#64748b' } }}
                      onClick={handleAttachClick}
                    >
                      <AttachFile fontSize='small' />
                    </IconButton>

                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip'
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFilesSelected}
                    />

                    <IconButton
                      onClick={handleSend}
                      sx={{
                        ml: 0.5,
                        width: 36,
                        height: 36,
                        bgcolor: '#01E268',
                        color: 'white',
                        borderRadius: '10px',
                        boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
                        '&:hover': { bgcolor: '#06c25a' },
                        '&:disabled': {
                          bgcolor: '#d1d5db',
                          color: '#9ca3af',
                          boxShadow: 'none',
                        },
                      }}
                      disabled={!draft.trim() || !connected}
                    >
                      <SendRoundedIcon fontSize='small' />
                    </IconButton>
                  </Box>
                </Paper>
              </Box>
            </>
          )}
        </Box>
      </Box>
      <AddMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        BASE_URL={BASE_URL}
        token={authToken}
        threadId={paramThreadId || paramThreadId}
      />
    </Box>
  );
}
