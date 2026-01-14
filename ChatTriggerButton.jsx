import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputBase,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../context/SocketContext';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const authToken = localStorage.getItem('authToken');

const MIN_MENU_HEIGHT = 280;
export function CustomSelect({
  value,
  onChange,
  placeholder,
  disabled,
  options = [],
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState(null);
  const [placement, setPlacement] = useState('bottom'); // 'bottom' | 'top'
  const fieldRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);
  const wrapperRef = useRef(null);
  const inputRootRef = useRef(null);

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return options;
    return options.filter((u) => (u.name || '').toLowerCase().includes(q));
  }, [options, localSearch]);

  const handleOpen = (e) => {
    if (disabled) return;

    // Measure the outer wrapper (exactly what’s visually fullWidth)
    const el = wrapperRef.current; // or: e.currentTarget.closest('.MuiFormControl-root')
    const r = el.getBoundingClientRect();
    setMenuWidth(Math.round(r.width));

    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < MIN_MENU_HEIGHT && spaceAbove > spaceBelow;
    setPlacement(openUp ? 'top' : 'bottom');

    const top = Math.round((openUp ? r.top : r.bottom) + window.scrollY);
    const left = Math.round(r.left + window.scrollX);
    setAnchorPos({ top, left });
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setLocalSearch('');
  };
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(() => {
      const r = wrapperRef.current.getBoundingClientRect();
      setMenuWidth(Math.round(r.width));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);
  return (
    <Box ref={wrapperRef} sx={{ position: 'relative' }}>
      <TextField
        // inputRef={fieldRef}
        fullWidth
        placeholder={placeholder}
        value={value ? value.name : ''}
        disabled={disabled}
        InputProps={{
          readOnly: true,
          startAdornment: value ? (
            <Avatar src={value.avatar} sx={{ width: 24, height: 24, mr: 1 }} />
          ) : null,
          endAdornment: <KeyboardArrowDownIcon sx={{ color: '#9ca3af' }} />,
        }}
        onClick={handleOpen}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
            bgcolor: disabled ? '#f3f4f6' : 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            '& fieldset': { borderColor: '#d1d5db' },
            '&:hover fieldset': {
              borderColor: disabled ? '#d1d5db' : '#9ca3af',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#01E268',
              boxShadow: '0 0 0 2px rgba(16,185,129,.2)',
            },
          },
          '& .MuiInputBase-input': {
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: value ? '#000' : '#6b7280',
          },
        }}
      />

      <Menu
        // render to body (default), positioned by absolute coords
        anchorReference='anchorPosition'
        anchorPosition={anchorPos || { top: 0, left: 0 }}
        open={open}
        onClose={closeMenu}
        disablePortal={false}
        keepMounted
        anchorOrigin={{
          vertical: placement === 'top' ? 'top' : 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: placement === 'top' ? 'bottom' : 'top',
          horizontal: 'left',
        }}
        // ⬇️ Raise the Modal root (not just the paper)
        slotProps={{
          root: { sx: { zIndex: 200000 } }, // Modal root
          paper: {
            sx: {
              boxSizing: 'border-box',
              zIndex: 200001, // Paper on top of root
              width: menuWidth || 400,
              minWidth: menuWidth || 400,
              borderRadius: 2,
              ml: '12px',
              boxShadow:
                '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              mt: placement === 'bottom' ? 1 : 0,
              mb: placement === 'top' ? 1 : 0,
              border: '2px solid var(--stroke, #EEE)',
            },
          },
        }}
        ModalProps={{ disableScrollLock: true }}
      >
        {/* Search */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder='Search'
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            size='small'
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                bgcolor: '#f8fafc',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: '#01E268' },
              },
            }}
          />
        </Box>

        {/* Options */}
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {filtered.length === 0 && localSearch && (
            <Typography sx={{ px: 2, py: 1.5, color: '#6b7280' }}>
              No users found
            </Typography>
          )}
          {filtered.map((user) => (
            <MenuItem
              key={user.id}
              onClick={() => {
                onChange(value?.id === user.id ? null : user);
                closeMenu();
              }}
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: value?.id === user.id ? '#dcfce7' : 'transparent',
                '&:hover': {
                  bgcolor: value?.id === user.id ? '#dcfce7' : '#f8fafc',
                },
              }}
            >
              <Checkbox
                checked={value?.id === user.id}
                sx={{
                  mr: 1,
                  p: 0,
                  color: value?.id === user.id ? '#01E268' : '#d1d5db',
                  '&.Mui-checked': { color: '#01E268' },
                }}
              />
              <Avatar
                src={user.avatar}
                sx={{ width: 32, height: 32, mr: 1.5 }}
              />
              <Typography variant='body2' fontWeight={500} color='#374151'>
                {user.name}
              </Typography>
            </MenuItem>
          ))}
        </Box>
      </Menu>
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
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : { Authorization: `Bearer ${localStorage.getItem('authToken')}` }),
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
              `${BASE_URL}api/users/getSubUsersList/${encodeURIComponent(
                role
              )}/approver`,
              { headers: authHeaders }
            ),
            fetch(
              `${BASE_URL}api/users/getSubUsersList/${encodeURIComponent(
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
            `${BASE_URL}api/chat/fetch/bankRelationship/initiator`,
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

export default function ChatButton() {
  let lastDay = '';
  const [chatPanelVisible, setChatPanelVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [selectedRelationshipManager, setSelectedRelationshipManager] =
    useState(null);
  const [selectedInitiator, setSelectedInitiator] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [approverAnchorEl, setApproverAnchorEl] = useState(null);
  const [initiatorAnchorEl, setInitiatorAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { connected, sendMessage, onNewMessage, joinThread, leaveThread } =
    useSocket();
  const [step, setStep] = useState('entity'); // 'entity' | 'select' | 'chat'
  const [entityRole, setEntityRole] = useState(null); // 'supplier' | 'corporate'
  const [loadingLists, setLoadingLists] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [approverOptions, setApproverOptions] = useState([]);
  const [initiatorOptions, setInitiatorOptions] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const selectedUser =
    selectedApprover || selectedInitiator || selectedRelationshipManager;
  const receiverId = activeChatUser?.id; // selectedApprover?.id || selectedInitiator?.id;
  const [checkingThread, setCheckingThread] = useState(false);
  const [existingThreadId, setExistingThreadId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const lastOutgoingRef = useRef(null);
  const [isUserOnline, setUserStatus] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [relationshipManagerOptions, setRelationshipManagerOptions] = useState(
    []
  );

  const humanizeEmail = (email) => {
    if (!email || !email.includes('@')) return email || 'User';
    const local = email.split('@')[0].replace(/\+.*/, ''); // strip +tag
    const spaced = local.replace(/[._-]+/g, ' ').trim(); // "john_doe" -> "john doe"
    return spaced ? spaced.replace(/\b\w/g, (c) => c.toUpperCase()) : email;
  };

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
        const S3File = json?.data?.url;
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

  const { set: mediaCacheSet, get: mediaCacheGet } = useMediaCache();
  const uploadAttachment = useUploadAttachment(
    BASE_URL,
    authToken,
    mediaCacheSet
  );
  const fileInputRef = useRef(null);
  const onAttachClick = () => fileInputRef.current?.click();

  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

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

    // Validation function
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
      if (!activeChatUser || !connected) continue;

      const clientMsgId = `file_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const nowIso = new Date().toISOString();
      const objectUrl = URL.createObjectURL(file);

      // optimistic
      // setMessages((prev) => [
      //   ...prev,
      //   {
      //     id: clientMsgId,
      //     clientMsgId,
      //     senderId: currentUserId || 'me',
      //     senderName: myName,
      //     senderRole: myRole,
      //     senderAvatar: myAvatar || 'i',
      //     content: '',
      //     type: 'media',
      //     mediaId: null,
      //     mediaUrl: objectUrl,
      //     fileName: file.name,
      //     mime: file.type,
      //     timestamp: nowIso,
      //     isCurrentUser: true,
      //     pending: true,
      //   },
      // ]);

      try {
        const { key, url, S3File } = await uploadAttachment(file);

        // update optimistic
        // setMessages((prev) =>
        //   prev.map((m) =>
        //     m.clientMsgId === clientMsgId
        //       ? { ...m, mediaId: key, mediaUrl: url, pending: false }
        //       : m
        //   )
        // );
        setMessages((prev) => [
          ...prev,
          {
            file: S3File,
            id: clientMsgId,
            clientMsgId,
            senderId: currentUserId || 'me',
            senderName: myName,
            senderRole: myRole,
            senderAvatar: myAvatar || 'i',
            content: '',
            type: 'media',
            mediaId: key ?? null,
            mediaUrl: url ?? objectUrl,
            fileName: file.name,
            mime: file.type,
            timestamp: nowIso,
            isCurrentUser: true,
            pending: false,
          },
        ]);

        // send socket payload
        sendMessage(
          {
            threadId: threadId ?? null,
            receiverId: Number(activeChatUser.id) || activeChatUser.id,
            message: key,
            type: 'media',
            clientMsgId,
          },
          (ack) => {
            if (ack?.threadId && !threadId) setThreadId(ack.threadId);
          }
        );

        // Show success toast for individual file upload
        toast.success(`"${file.name}" uploaded successfully!`);
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMsgId === clientMsgId
              ? { ...m, pending: false, error: 'Upload failed' }
              : m
          )
        );

        // Show error toast
        toast.error(`Failed to upload "${file.name}". Please try again.`);
      }
    }
  };

  const Navigate = useNavigate();
  function mapSubUsers(json) {
    // Accept several possible shapes and always return [{id,name,avatar}]
    const records =
      json?.data?.records ??
      json?.data?.data?.records ?? // super defensive
      json?.records ??
      [];

    return records.map((r) => {
      const u = r?.User ?? {};
      const p = r?.profile ?? {};
      const id = String(u.id ?? u._id ?? p.userId ?? Math.random());
      const name =
        p.fullName ||
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        (u.email ? humanizeEmail(u.email) : `User ${id}`);
      const avatar = resolveAvatarUrl({ profile: p, ...u, _raw: r });

      return { id, name, avatar, _raw: r };
    });
  }

  async function checkThreadAlreadyCreated(userId) {
    if (!userId) return null;
    const url = `${BASE_URL}api/chat/checkThreadAlreadyCreated/${userId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken
          ? { Authorization: `Bearer ${authToken}` }
          : { Authorization: `Bearer ${localStorage.getItem('authToken')}` }),
      },
    });

    // tolerate non-JSON errors
    let json = null;
    try {
      json = await res.json();
    } catch (_) {}

    if (!res.ok) {
      const msg = json?.message || `Check thread failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    // handle shapes: data=null | data=threadId | data:{id} | {threadId}
    const tid =
      json?.data?.threadId ??
      json?.data?.id ??
      (typeof json?.data === 'string' || typeof json?.data === 'number'
        ? json.data
        : null) ??
      json?.threadId ??
      null;

    return tid ?? null;
  }

  async function fetchSubUsers(role, subRole) {
    const url = `${BASE_URL}api/users/getSubUsersList/${role}/${subRole}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken
        ? { Authorization: `Bearer ${authToken}` }
        : { Authorization: `Bearer ${localStorage.getItem('authToken')}` }),
    };

    const res = await fetch(url, {
      headers /*, credentials:'include' if needed */,
    });

    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      console.error('[subUsers] JSON parse error', e);
      throw new Error(`Bad JSON for ${role}/${subRole}`);
    }

    if (!res.ok) {
      // surface server message if present
      const msg = json?.message || `Failed ${role}/${subRole}`;
      throw new Error(`${msg} (HTTP ${res.status})`);
    }

    return mapSubUsers(json);
  }
  const profile = useSelector((state) => state.profile);
  const myUserData = JSON.parse(localStorage.getItem('chatData'));

  const pendingClientIds = useRef(new Set());

  const resolveAvatarUrl = (objOrUrl) => {
    if (!objOrUrl) return '';
    if (typeof objOrUrl === 'string') return objOrUrl; // already a URL
    const o = objOrUrl;
    return (
      o?.profile_image ||
      o?.profile?.profilePicture?.generatedUrl ||
      o?.profilePicture?.generatedUrl ||
      o?.avatarUrl ||
      o?.avatar ||
      o?.profileImage ||
      o?._raw?.profile?.profilePicture?.generatedUrl ||
      ''
    );
  };
  // --- utilities
  const myAvatar =
    myUserData?.profilePicture ||
    myUserData?.profile?.profilePicture ||
    profile?.profile?.profilePicture?.generatedUrl ||
    '';

  const myName = myUserData?.fullName || profile?.profile?.fullName || 'You';

  const myRole =
    myUserData?.Designation ||
    `${profile?.role} ${profile?.subUserRole}` ||
    'User';

  const titleCase = (s = '') => (s ? s[0].toUpperCase() + s.slice(1) : '');
  const sameMinute = (a, b) => {
    const da = new Date(a),
      db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate() &&
      da.getHours() === db.getHours() &&
      da.getMinutes() === db.getMinutes()
    );
  };

  const formatDay = (ts) =>
    new Date(ts).toLocaleDateString(undefined, { weekday: 'long' });
  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const parseJwt = (t) => {
    try {
      const [, p] = t.split('.');
      const json = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return {};
    }
  };
  const currentUserId = useMemo(() => {
    const p = parseJwt(authToken || '');
    return String(p?.id ?? p?.userId ?? '');
  }, [authToken]);

  const myUserIds = useMemo(() => {
    const ids = [
      currentUserId,
      String(profile?.id ?? ''),
      String(profile?.user?.id ?? ''),
      String(profile?.User?.id ?? ''),
      String(profile?.profile?.userId ?? ''),
    ]
      .filter(Boolean)
      .map(String);
    return Array.from(new Set(ids)); // unique
  }, [currentUserId, profile]);

  // resolve pretty badge for a user (Supplier Approver / Corporate Initiator)
  const resolveBadge = (user) => {
    if (!user) return 'Relationship Manager';
    if (selectedApprover?.id === user.id)
      return `${titleCase(entityRole)} Approver`;
    if (selectedInitiator?.id === user.id)
      return `${titleCase(entityRole)} Initiator`;
    // from API payload if present
    return user?._raw?.role || 'Relationship Manager';
  };

  const initials = (s = '') =>
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] || '').toUpperCase())
      .join('');

  async function fetchThreadHistory(tid) {
    const base = (BASE_URL || '').replace(/\/$/, '');
    const url = `${base}/api/chat/fetchThreadDetail/${tid}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken
          ? { Authorization: `Bearer ${authToken}` }
          : { Authorization: `Bearer ${localStorage.getItem('authToken')}` }),
      },
    });

    let json = null;
    try {
      json = await res.json();
    } catch {}
    if (!res.ok)
      throw new Error(json?.message || `History fetch failed (${res.status})`);

    // Accept several shapes: {data: [...] } | [...]
    const isUserOnline = json?.data?.isOnline || false;
    setUserStatus(isUserOnline);
    const rawList = Array.isArray(json) ? json : json?.data?.threadDetail ?? [];
    // Normalize to your message shape
    const normalized = rawList.map((m) => {
      const senderId = String(m?.senderId ?? m?.sender_id ?? m?.userId ?? '');
      const mine = currentUserId && senderId === String(currentUserId);

      // Try to enrich from API's embedded user, else fall back to known selections
      const u = m?.User || m?.user || null;
      const otherUser =
        !mine && activeChatUser && String(activeChatUser.id) === senderId
          ? activeChatUser
          : !mine &&
            selectedApprover &&
            String(selectedApprover.id) === senderId
          ? selectedApprover
          : !mine &&
            selectedInitiator &&
            String(selectedInitiator.id) === senderId
          ? selectedInitiator
          : null;

      const senderName = mine
        ? myName || 'You'
        : u?.fullName ||
          u?.name ||
          (u?.email ? humanizeEmail(u.email) : undefined) ||
          (mine ? myRole || 'You' : otherUser?.name) ||
          'User';
      const senderAvatar =
        m?.User?.profilePicture?.generatedUrl || mine
          ? myAvatar
          : otherUser?.avatar || '';

      const designation =
        u?.designation ||
        u?.profile?.designation ||
        otherUser?._raw?.designation;

      const roleBadge = mine
        ? myRole
        : otherUser
        ? resolveBadge(otherUser)
        : u?.role || 'User';

      const isMedia =
        m?.type === 'media' ||
        (typeof m?.message === 'object' && m?.message?.type === 'media');
      const mediaId = isMedia ? m?.mediaId ?? m?.message : null;
      const s3 = m?.file?.generatedUrl || '';

      return {
        ...m,
        id: String(m?.id ?? `${senderId}-${m?.createdAt ?? Date.now()}`),
        senderId,
        senderName,
        senderRole: roleBadge,
        senderDesignation: designation, // only render if present (bank)
        senderAvatar,

        timestamp: m?.createdAt ?? m?.timestamp ?? new Date().toISOString(),
        // type: m?.type || 'text',
        isCurrentUser: mine,
        content: isMedia ? '' : String(m?.content ?? m?.message ?? ''),
        type: isMedia ? 'media' : 'text',
        mediaId,
        mediaUrl:
          s3 ||
          (mediaId ? makeUrlForKey(BASE_URL, mediaCacheGet, mediaId) : ''),
      };
    });

    // Ensure chronological order (oldest first)
    normalized.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return normalized;
  }

  // Load history whenever we have a threadId (resume OR new)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!threadId) return;
      try {
        setHistoryLoading(true);
        const hist = await fetchThreadHistory(threadId);
        if (cancelled) return;
        setMessages(hist); // replace with history
      } catch (e) {
        console.error('[history] error', e);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // Simple initials fallback if avatar is missing
  const getInitials = (s = '') =>
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');

  // Prefer the started chat user; otherwise the currently selected one
  const chatUser = activeChatUser || selectedUser;

  const chatUserRole =
    chatUser?._raw?.role ||
    chatUser?._raw?.User?.role ||
    (selectedApprover?.id === chatUser?.id
      ? 'Approver'
      : selectedInitiator?.id === chatUser?.id
      ? 'Initiator'
      : 'User');

  // Avatar & name with safe fallbacks
  const chatUserName = chatUser?.name || '—';
  const chatUserAvatar = chatUser?.avatar || '';

  const handleStartConversation = async () => {
    if (!selectedUser) return;

    try {
      // If the API already told us there is a thread, resume it
      if (existingThreadId) {
        setActiveChatUser(selectedUser);
        setIsChatOpen(true);
        setChatPanelVisible(false);
        setThreadId(existingThreadId);
        joinThread(Number(existingThreadId));

        setMessages([
          {
            id: 'sys-resume',
            senderId: 'system',
            senderName: 'System',
            content: `Resumed chat with ${selectedUser.name}`,
            timestamp: new Date().toISOString(),
            type: 'system',
          },
        ]);
        return; // <- don't create a new one
      }

      // Otherwise create a new thread
      const res = await fetch(
        `${BASE_URL.replace(/\/$/, '')}/api/chat/createThread`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ userId: selectedUser.id }),
        }
      );

      if (!res.ok) throw new Error(`Failed to create thread: ${res.status}`);

      const data = await res.json();
      const newThreadId =
        data?.data?.id ?? data?.data?.threadId ?? data?.threadId ?? null;

      setActiveChatUser(selectedUser);
      setIsChatOpen(true);
      setChatPanelVisible(false);
      setThreadId(newThreadId || null);
      joinThread(Number(newThreadId));

      setMessages([
        {
          id: 'sys-join',
          senderId: 'system',
          senderName: 'System',
          content: `${selectedUser.name} chat started`,
          timestamp: new Date().toISOString(),
          type: 'system',
        },
      ]);
    } catch (err) {
      console.error('[createThread] failed:', err);
      setMessages([
        {
          id: 'sys-error',
          senderId: 'system',
          senderName: 'System',
          content: 'Could not start the chat. Please try again.',
          timestamp: new Date().toISOString(),
          type: 'system',
        },
      ]);
    }
  };
  const findKnownUser = (id) => {
    const sid = String(id ?? '');
    const pools = [
      activeChatUser,
      selectedApprover,
      selectedInitiator,
      ...(approverOptions || []),
      ...(initiatorOptions || []),
    ].filter(Boolean);
    return pools.find((u) => String(u.id) === sid) || null;
  };

  const openFullChat = () => {
    const tid = threadId || existingThreadId || ''; // if you already have one
    const uid = activeChatUser?.id || selectedUser?.id || ''; // fallback

    // optional safety cache (helps when user reloads / lands directly)
    localStorage.setItem(
      'lastChat',
      JSON.stringify({ threadId: tid, userId: uid })
    );

    const qs = new URLSearchParams();
    if (tid) qs.set('threadId', String(tid));
    if (uid) qs.set('userId', String(uid));

    Navigate(`/chat-board${qs.toString() ? `?${qs}` : ''}`, {
      state: { fromWidget: true },
    });
  };

  const handleSendMessage = () => {
    if (!input.trim() || !selectedUser || !connected) return;
    if (!activeChatUser) return;

    const msg = input.trim();

    // Create a client-generated id to reconcile echoes
    const clientMsgId =
      (crypto?.randomUUID && crypto.randomUUID()) ||
      `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    pendingClientIds.current.add(clientMsgId);

    // Optimistic bubble
    const nowIso = new Date().toISOString();
    lastOutgoingRef.current = { text: msg, ts: nowIso, clientMsgId };

    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        clientMsgId,
        senderId: currentUserId || 'me',
        senderName: myName,
        senderRole: myRole,
        senderAvatar: myAvatar || 'i',
        content: msg,
        timestamp: nowIso,
        type: 'text',
        isCurrentUser: true,
      },
    ]);
    setInput('');

    const payload = {
      threadId: threadId ?? null,
      message: msg,
      receiverId: Number(activeChatUser.id) || activeChatUser.id,
      clientMsgId,
    };
    console.log('[SEND] emit sendMessage', payload);

    sendMessage(payload, (ack) => {
      console.log('[SOCKET] sendMessage ACK:', ack);
      if (ack?.threadId && !threadId) setThreadId(ack.threadId);
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!entityRole) return;
      setLoadingLists(true);
      setFetchError(null);
      try {
        const [approvers, initiators, relationshipManagers] = await Promise.all(
          [
            fetchSubUsers(entityRole, 'approver'),
            fetchSubUsers(entityRole, 'initiator'),
            entityRole === 'bank'
              ? fetchSubUsers(entityRole, 'RelationshipManager')
              : Promise.resolve([]),
          ]
        );
        if (cancelled) return;
        setApproverOptions(approvers); // <-- should now be non-empty
        setInitiatorOptions(initiators);
        setRelationshipManagerOptions(relationshipManagers);
        setStep('select'); // proceed to your Approver/Initiator UI
      } catch (e) {
        if (cancelled) return;
        console.error('[subUsers] fetch error', e);
        setFetchError(e.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityRole]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // clear previous findings
      setExistingThreadId(null);

      if (!selectedUser) return;

      try {
        setCheckingThread(true);
        const tid = await checkThreadAlreadyCreated(selectedUser.id);
        if (cancelled) return;

        setExistingThreadId(tid || null);
        // Optional: reflect the selected user in the chat header earlier
        setActiveChatUser(selectedUser);
      } catch (e) {
        if (cancelled) return;
        console.error('[checkThread] error:', e);
        setExistingThreadId(null);
      } finally {
        if (!cancelled) setCheckingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  const reset = () => {
    setStep('entity');
    setEntityRole(null);
    setApproverOptions([]);
    setInitiatorOptions([]);
    setFetchError(null);
    setLoadingLists(false);
    setSelectedApprover(null);
    setSelectedInitiator(null);
    setIsChatOpen(false);
    setMessages([]);
    setApproverAnchorEl(null);
    setInitiatorAnchorEl(null);
    setSearchTerm('');
  };

  // useEffect(() => {
  //   if (!isChatOpen) return;
  //   const off = onNewMessage((incoming) => {
  //     console.log('[SOCKET] new_message:', incoming);
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         id: String(Date.now()),
  //         senderId: incoming?.senderId,
  //         senderName: incoming?.senderName || 'Unknown',
  //         content: incoming?.message || incoming?.content || '',
  //         timestamp: new Date().toLocaleTimeString([], {
  //           hour: '2-digit',
  //           minute: '2-digit',
  //         }),
  //         type: 'text',
  //       },
  //     ]);
  //     if (!threadId && incoming?.threadId) setThreadId(incoming.threadId);
  //   });
  //   return off;
  // }, [isChatOpen, onNewMessage, threadId]);

  const listRef = useRef(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const off = onNewMessage((payload) => {
      const batch = Array.isArray(payload) ? payload : [payload];
      console.log('batch', batch);

      for (const incoming of batch) {
        // Normalize root/message
        const msg = incoming?.message || incoming;

        // Thread guard (server may send threadId | thread_id on root or message)
        const incThread =
          incoming?.threadId ??
          msg?.threadId ??
          msg?.thread_id ??
          incoming?.thread_id;
        if (threadId && incThread && String(incThread) !== String(threadId))
          continue;

        const isMedia =
          msg?.type === 'media' ||
          (typeof incoming?.message === 'object' &&
            incoming?.message?.type === 'media');
        const mediaId = isMedia
          ? msg?.content ?? msg?.mediaId ?? incoming?.message?.content ?? null
          : null;
        const file = isMedia ? msg?.file || incoming?.file : null;
        const s3Url =
          msg?.file?.generatedUrl || incoming?.file?.generatedUrl || '';
        const mime = msg?.file?.metadata?.mimetype || '';
        const originalName = msg?.file?.metadata?.originalname || '';
        const text = isMedia
          ? ''
          : typeof incoming?.message === 'string'
          ? incoming.message
          : incoming?.message?.content ?? incoming?.content ?? '';

        // Timestamp normalization
        const createdAt =
          incoming?.createdAt ??
          msg?.createdAt ??
          msg?.timestamp ??
          new Date().toISOString();

        // Client echo reconciliation (best path)
        const echoedClientId =
          incoming?.clientMsgId ?? msg?.clientMsgId ?? incoming?.tempId;
        if (echoedClientId && pendingClientIds.current.has(echoedClientId)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMsgId === echoedClientId
                ? {
                    ...m,
                    id: String(
                      msg?.id ?? msg?.messageId ?? incoming?.id ?? m.id
                    ),
                    serverId: String(
                      msg?.id ??
                        msg?.messageId ??
                        incoming?.id ??
                        m.serverId ??
                        ''
                    ),
                    file,
                    timestamp: createdAt,
                    type: isMedia ? 'media' : m.type,
                    mediaId: isMedia ? mediaId ?? m.mediaId : m.mediaId,
                    mediaUrl: isMedia ? s3Url || m.mediaUrl : m.mediaUrl,
                    mime: isMedia ? mime || m.mime : m.mime,
                    fileName: isMedia ? originalName || m.fileName : m.fileName,
                  }
                : m
            )
          );
          pendingClientIds.current.delete(echoedClientId);
          continue; // handled our own echo
        }

        // Sender fields (server nests under message.sender)
        const s = msg?.sender || {};
        const senderIdStr = String(
          s?.id ??
            msg?.senderId ??
            msg?.userId ??
            incoming?.senderId ??
            incoming?.userId ??
            ''
        );

        // Time-window heuristic for silent echoes
        const isWithin = (a, b, ms = 8000) =>
          Math.abs(new Date(a) - new Date(b)) < ms;
        if (!echoedClientId) {
          const last = lastOutgoingRef.current;
          if (last && last.text === text && isWithin(createdAt, last.ts)) {
            // If it's mine (by id) or no id at all, swallow the echo
            const mineById = senderIdStr && myUserIds.includes(senderIdStr);
            if (mineById || !senderIdStr) {
              // Optionally update optimistic timestamp
              setMessages((prev) => {
                if (!prev.length) return prev;
                const i = prev.length - 1;
                if (prev[i]?.isCurrentUser && prev[i]?.content === text) {
                  const copy = [...prev];
                  copy[i] = { ...copy[i], timestamp: createdAt };
                  return copy;
                }
                return prev;
              });
              continue;
            }
          }
        }

        // Build identity (prefer your known user pools; else use socket sender; else active peer)
        const isMine = senderIdStr && myUserIds.includes(senderIdStr);
        const known = senderIdStr ? findKnownUser(senderIdStr) : null;
        const fallbackPeer = !isMine ? activeChatUser : null;

        const senderName =
          known?.name ||
          [s?.firstName, s?.lastName].filter(Boolean).join(' ') ||
          s?.fullName ||
          s?.name ||
          (s?.email ? humanizeEmail(s.email) : undefined) ||
          incoming?.senderName ||
          fallbackPeer?.name ||
          'User';

        const senderAvatar =
          known?.avatar ||
          s?.profile_image ||
          resolveAvatarUrl(s) ||
          fallbackPeer?.avatar ||
          '';

        const senderRole = known
          ? resolveBadge(
              known || incoming?.message?.sender?.role || incoming?.sender?.role
            )
          : incoming?.senderRole ||
            (fallbackPeer ? resolveBadge(fallbackPeer) : 'You');

        const senderDesignation =
          known?._raw?.designation || fallbackPeer?._raw?.designation;

        const inferredSenderId =
          senderIdStr || String(fallbackPeer?.id ?? 'other');

        // Server id normalization (server uses messageId)
        const serverId = String(
          msg?.messageId ?? msg?.id ?? incoming?.id ?? ''
        );

        const baseEntry = {
          serverId,
          id:
            serverId ||
            `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          clientMsgId: echoedClientId || undefined,
          senderId: inferredSenderId,
          senderName,
          senderRole,
          senderDesignation,
          senderAvatar,
          file,
          content: String(text ?? ''),
          timestamp: createdAt,
          type: isMedia ? 'media' : 'text',
          mediaId: isMedia ? mediaId : null,
          mediaUrl: isMedia
            ? s3Url ||
              (mediaId ? makeUrlForKey(BASE_URL, mediaCacheGet, mediaId) : '')
            : '',
          mime: isMedia ? mime : '',
          fileName: isMedia ? originalName : '',
          isCurrentUser: false,
        };

        // Append (serverId path)
        if (serverId) {
          setMessages((prev) => {
            if (prev.some((m) => String(m.serverId || m.id) === serverId))
              return prev;
            return [...prev, baseEntry];
          });
        } else {
          // soft de-dupe for text; always allow media w/o id
          if (!isMedia) {
            setMessages((prev) => {
              const minuteKey = (d) => new Date(d).toISOString().slice(0, 16);
              const dupe = prev.find(
                (m) =>
                  !m.isCurrentUser &&
                  m.senderId === inferredSenderId &&
                  m.content === String(text ?? '') &&
                  minuteKey(m.timestamp) === minuteKey(createdAt)
              );
              if (dupe) return prev;
              return [...prev, baseEntry];
            });
          } else {
            setMessages((prev) => [...prev, baseEntry]);
          }
        }

        // Append (no serverId → soft dedupe on same minute + same text)
        setMessages((prev) => {
          const minuteKey = (d) => new Date(d).toISOString().slice(0, 16);
          const dupe = prev.find(
            (m) =>
              !m.isCurrentUser &&
              m.senderId === inferredSenderId &&
              m.content === String(text ?? '') &&
              minuteKey(m.timestamp) === minuteKey(createdAt)
          );
          if (dupe) return prev;

          return [
            ...prev,
            {
              id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              senderId: inferredSenderId,
              file,
              senderName,
              senderRole,
              senderDesignation,
              senderAvatar,
              content: String(text ?? ''),
              timestamp: createdAt,
              type: 'text',
              isCurrentUser: false,
            },
          ];
        });
      }
    });

    return off;
  }, [onNewMessage, threadId, myUserIds, activeChatUser]);

  const groups = useMemo(() => {
    if (!messages?.length) return [];

    const out = [];
    for (const m of messages) {
      const last = out[out.length - 1];
      const sameSender = last && last.senderId === m.senderId;
      const withinMinute = last && sameMinute(last.headerTs, m.timestamp);

      if (sameSender && withinMinute) {
        // append to last group
        last.items.push({
          file: m.file,
          id: m.id,
          text: m.content,
          ts: m.timestamp,
          isCurrentUser: m.isCurrentUser,
          type: m.type,
          mediaUrl: m.mediaUrl,
          mediaId: m.mediaId,
          mime: m.mime,
          fileName: m.fileName,
        });
        // expand headerTs if you want tightest minute—keeping earliest is fine
      } else {
        // start new group
        out.push({
          senderId: m.senderId,
          isCurrentUser: !!m.isCurrentUser,
          senderName: m.senderName,
          senderRole: m.User?.role || m.senderRole,
          senderDesignation: m.senderDesignation,
          senderAvatar: m.User?.profileImage?.generatedUrl || m.senderAvatar,
          headerTs: m.timestamp,
          day: formatDay(m.timestamp),
          time: formatTime(m.timestamp),
          items: [
            {
              file: m.file,
              id: m.id,
              text: m.content,
              ts: m.timestamp,
              isCurrentUser: m.isCurrentUser,
              type: m.type,
              mediaUrl: m.mediaUrl,
              mediaId: m.mediaId,
              mime: m.mime,
              fileName: m.fileName,
            },
          ],
        });
      }
    }
    return out;
  }, [messages]);

  useEffect(() => {
    if (isChatOpen === false) {
      // Emit socket event when panel is hidden
      leaveThread(Number(threadId));
    }
  }, [isChatOpen]);

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999 }}>
      {/* Selection Panel */}
      {chatPanelVisible && !isChatOpen && (
        <Box
          sx={{
            width: 500,
            p: 4,
            mb: 2,
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
              pb: 2,
              borderBottom: '1px solid var(--stroke, #EEE)',
            }}
          >
            <Typography
              variant='h5'
              sx={{
                color: 'var(--Text, #414651)',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
              }}
            >
              {step === 'entity' ? 'Select Entity' : 'Chat'}
            </Typography>
            <IconButton
              size='small'
              onClick={() => {
                setChatPanelVisible(false);
                reset();
              }}
              sx={{ color: '#9ca3af' }}
            >
              <CloseIcon fontSize='small' />
            </IconButton>
          </Box>

          {/* STEP 0: Select Entity */}
          {step === 'entity' && (
            <>
              <Typography
                sx={{
                  pb: 3,
                  color: '#414651',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '24px',
                }}
              >
                Please select user to continue chat!
              </Typography>

              <RadioGroup
                value={entityRole || ''}
                onChange={(e) => setEntityRole(e.target.value)} // triggers fetch
                sx={{ gap: 1, my: 2 }}
              >
                {profile?.role === 'supplier' ||
                profile?.role === 'corporate' ? (
                  <FormControlLabel
                    value='bank'
                    control={
                      <Radio
                        sx={{
                          color: '#d1d5db',
                          '&.Mui-checked': { color: '#01E268' },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#374151', fontWeight: 500 }}>
                        Bank
                      </Typography>
                    }
                  />
                ) : (
                  <FormControlLabel
                    value='supplier'
                    control={
                      <Radio
                        sx={{
                          color: '#d1d5db',
                          '&.Mui-checked': { color: '#01E268' },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#374151', fontWeight: 500 }}>
                        Supplier
                      </Typography>
                    }
                  />
                )}
                {profile?.role !== 'corporate' ? (
                  <FormControlLabel
                    value='corporate'
                    control={
                      <Radio
                        sx={{
                          color: '#d1d5db',
                          '&.Mui-checked': { color: '#01E268' },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#374151', fontWeight: 500 }}>
                        Corporate
                      </Typography>
                    }
                  />
                ) : (
                  <FormControlLabel
                    value='supplier'
                    control={
                      <Radio
                        sx={{
                          color: '#d1d5db',
                          '&.Mui-checked': { color: '#01E268' },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ color: '#374151', fontWeight: 500 }}>
                        Supplier
                      </Typography>
                    }
                  />
                )}
              </RadioGroup>

              {loadingLists && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
                >
                  <CircularProgress size={18} />
                  <Typography variant='body2' color='#6b7280'>
                    Loading users…
                  </Typography>
                </Box>
              )}
              {fetchError && (
                <Alert severity='error' sx={{ mb: 3 }}>
                  {fetchError}
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant='outlined'
                  onClick={() => {
                    setChatPanelVisible(false);
                    reset();
                  }}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderColor: '#040A33',
                    color: '#040A33',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#040A33', bgcolor: '#f9fafb' },
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </>
          )}

          {/* STEP 1: Your existing Approver / Initiator selects (fed by API) */}
          {step === 'select' && (
            <>
              {entityRole === 'bank' ? (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    sx={{
                      mb: 2,
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    Relationship Manager
                  </Typography>
                  <CustomSelect
                    value={selectedRelationshipManager}
                    onChange={setSelectedRelationshipManager}
                    placeholder='Select Relationship Manager'
                    // disabled={!!selectedInitiator}
                    options={relationshipManagerOptions}
                  />
                </Box>
              ) : (
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
                      onChange={setSelectedApprover}
                      placeholder='Select Approver'
                      disabled={!!selectedInitiator}
                      options={approverOptions}
                    />
                  </Box>

                  <Box sx={{ mb: 4 }}>
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
                      onChange={setSelectedInitiator}
                      placeholder='Select Initiator'
                      disabled={!!selectedApprover}
                      options={initiatorOptions}
                    />
                  </Box>
                </>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'end',
                  gap: 3,
                }}
              >
                <Button
                  variant='contained'
                  onClick={handleStartConversation}
                  disabled={!selectedUser || checkingThread}
                  endIcon={<SendIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    bgcolor: '#01E268',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': { bgcolor: '#059669' },
                    '&:disabled': { bgcolor: '#d1d5db', color: '#9ca3af' },
                  }}
                >
                  {checkingThread && (
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'var(--primary-contrast, #FFF)',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '20px',
                      }}
                    >
                      Checking existing thread…
                    </Typography>
                  )}
                  {existingThreadId ? (
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'var(--primary-contrast, #FFF)',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '20px',
                      }}
                    >
                      Resume Conversation
                    </Typography>
                  ) : (
                    <Typography
                      variant='caption'
                      sx={{
                        color: 'var(--primary-contrast, #FFF)',
                        fontSize: '14px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '20px',
                      }}
                    >
                      Start Conversation
                    </Typography>
                  )}
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => {
                    setChatPanelVisible(false);
                    reset();
                  }}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderColor: '#040A33',
                    color: '#040A33',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#040A33', bgcolor: '#f9fafb' },
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Chat Window */}
      {isChatOpen && selectedUser && (
        <Box
          sx={{
            width: 400,
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            mb: 2,
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              bgcolor: 'white',
              borderBottom: 'none',
              flexShrink: 0,
            }}
          >
            <Typography
              variant='h6'
              sx={{
                flexGrow: 1,
                fontSize: '18px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Chat
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size='small'
                onClick={openFullChat}
                sx={{ color: '#9ca3af' }}
              >
                <OpenInFullIcon fontSize='small' />
              </IconButton>
              <IconButton
                size='small'
                onClick={reset}
                sx={{ color: '#9ca3af' }}
              >
                <CloseIcon fontSize='small' />
              </IconButton>
            </Box>
          </Box>

          {/* User Info Section */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              bgcolor: 'white',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Avatar src={chatUserAvatar} sx={{ width: 48, height: 48, mr: 2 }}>
              {getInitials(chatUserName)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography fontWeight='600' fontSize='16px' color='#111827'>
                {chatUserName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='body2' color='#6b7280' fontSize='14px'>
                  {chatUserRole}
                </Typography>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isUserOnline ? '#01E268' : '#9ca3af',
                  }}
                />
                <Typography
                  variant='caption'
                  color={isUserOnline ? '#01E268' : '#9ca3af'}
                  fontSize='12px'
                >
                  {isUserOnline ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Messages */}
          {/* Messages */}
          <Box ref={listRef} sx={{ flexGrow: 1, p: 3, overflowY: 'auto', minHeight: 0 }}>
            {historyLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}

            {/* Day separators  groups */}
            {groups.map((g, idx) => {
              const showDay = g.day !== lastDay;
              lastDay = g.day;

              // system group (rare) – center chip
              const isSystem = !g.senderId || g.senderName === 'System';

              return (
                <Box key={`grp-${idx}`} sx={{ mb: 3 }}>
                  {showDay && (
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Chip
                        label={g.day}
                        size='small'
                        sx={{
                          bgcolor: '#f3f4f6',
                          color: '#6b7280',
                          fontSize: '12px',
                        }}
                      />
                    </Box>
                  )}

                  {isSystem ? (
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          display: 'inline-block',
                          bgcolor: '#dcfce7',
                          color: '#166534',
                          px: 2,
                          py: 1,

                          borderRadius: 20,
                          fontSize: '14px',
                        }}
                      >
                        {g.items[0]?.text}
                      </Box>
                    </Box>
                  ) : g.isCurrentUser ? (
                    // --- Outgoing (RIGHT)
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 1,
                      }}
                    >
                      {/* Outgoing group header (You · role · time · avatar) */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                          justifyContent: 'flex-end',
                          width: '100%',
                        }}
                      >
                        <Avatar
                          src={g.senderAvatar}
                          sx={{ width: 24, height: 24 }}
                        >
                          {initials(g?.senderName || 'You')}
                        </Avatar>

                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography
                            fontSize='14px'
                            fontWeight='600'
                            color='#111827'
                            noWrap
                          >
                            {g?.senderName || 'You'}
                          </Typography>
                          <Typography fontSize='12px' color='#6b7280' noWrap>
                            ({g?.senderRole || 'Bank Initiator'})
                          </Typography>
                        </Box>
                        {/* <Typography
                            fontSize='12px'
                            color='#6b7280'
                            sx={{ mr: 1 }}
                          >
                            {g?.time}
                          </Typography> */}
                      </Box>
                      {g.items
                        .filter(
                          (item, idx, arr) =>
                            arr.findIndex((i) =>
                              item.type === 'media'
                                ? i.mediaId === item.mediaId
                                : i.id === item.id
                            ) === idx
                        )
                        .map((it) => (
                          <Box
                            key={it.id}
                            sx={{
                              maxWidth: '80%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                              bgcolor: '#01E268',
                              color: 'white',
                              borderRadius: '14px 14px 4px 14px',
                              borderTopRightRadius: 4,
                              px: 2,
                              py: 1.5,
                              position: 'relative',
                              alignItems: 'end',
                            }}
                          >
                            {it.type === 'media' ? (
                              <FilePreview file={it.file} />
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: 14,
                                  lineHeight: 1.4,
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'anywhere',
                                  wordBreak: 'break-word',
                                  hyphens: 'auto',
                                }}
                              >
                                {String(it.text ?? '')}
                              </Typography>
                            )}
                            <Typography
                              variant='caption'
                              sx={{
                                // position: 'absolute',

                                fontSize: 10,
                                opacity: 0.9,
                                color: 'white',
                              }}
                            >
                              {formatTime(it.ts)}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    // --- Incoming (LEFT) with header
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        src={g.senderAvatar}
                        sx={{ width: 32, height: 32, flexShrink: 0 }}
                      >
                        {initials(g.senderName)}
                      </Avatar>

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Header w/ name, role(+designation), timestamp */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Box
                            sx={{ display: 'flex', flexDirection: 'column' }}
                          >
                            <Typography
                              fontSize='14px'
                              fontWeight='600'
                              color='#111827'
                              noWrap
                            >
                              {g.senderName}
                            </Typography>
                            <Typography fontSize='12px' color='#6b7280' noWrap>
                              ({g.senderRole}
                              {g.senderDesignation
                                ? ` • ${g.senderDesignation}`
                                : ''}
                              )
                            </Typography>
                          </Box>
                          {/* <Typography
                              fontSize='12px'
                              color='#6b7280'
                              sx={{ ml: 'auto' }}
                            >
                              {g.time}
                            </Typography> */}
                        </Box>

                        {/* Bubbles */}
                        {g.items.map((it) => (
                          <Box
                            key={it.id}
                            sx={{
                              bgcolor: '#f3f4f6',
                              color: '#111827',
                              borderRadius: '14px 14px 14px 4px',
                              borderTopLeftRadius: 4,
                              px: 2,
                              py: 1.5,
                              position: 'relative',
                              mb: 1,
                              width: 'fit-content',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                              alignItems: 'start',
                            }}
                          >
                            {it.type === 'media' ? (
                              <FilePreview file={it.file} />
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: 14,
                                  lineHeight: 1.4,
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'anywhere',
                                  wordBreak: 'break-word',
                                  hyphens: 'auto',
                                }}
                              >
                                {String(it.text ?? '')}
                              </Typography>
                            )}
                            <Typography
                              variant='caption'
                              sx={{
                                fontSize: 10,
                                opacity: 0.8,
                                color: '#6b7280',
                              }}
                            >
                              {formatTime(it.ts)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Input */}
          <Box sx={{ px: 2.5, pb: 1, bgcolor: 'white', flexShrink: 0 }}>
            <Paper
              elevation={0}
              sx={{
                position: 'relative',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                bgcolor: 'white',
              }}
            >
              <InputBase
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                placeholder='Send a message'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // optional: send on Ctrl/Cmd+Enter
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
                    handleSendMessage();
                }}
                sx={{
                  p: 1.5,
                  pr: 16, // space so text doesn’t go under buttons
                  fontSize: 14,
                  bgcolor: '#fff',
                  borderRadius: '12px',
                  alignItems: 'flex-start',
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
                <IconButton
                  size='small'
                  sx={{ color: 'inherit', '&:hover': { color: '#64748b' } }}
                  onClick={() => setInviteOpen(true)}
                >
                  <AddIcon fontSize='small' />
                </IconButton>

                <IconButton
                  size='small'
                  sx={{ color: 'inherit', '&:hover': { color: '#64748b' } }}
                  onClick={onAttachClick}
                >
                  <AttachFileIcon fontSize='small' />
                </IconButton>

                <input
                  ref={fileInputRef}
                  type='file'
                  multiple
                  accept='image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip'
                  style={{ display: 'none' }}
                  onChange={handleAttachFiles}
                />

                <IconButton
                  onClick={handleSendMessage}
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
                  disabled={!input.trim() || !connected || !activeChatUser}
                >
                  <SendIcon fontSize='small' />
                </IconButton>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Floating Chat Button */}
      <IconButton
        onClick={() => {
          setChatPanelVisible(!chatPanelVisible);
        }}
        sx={{
          bgcolor: '#01E268',
          color: 'white',
          '&:hover': { bgcolor: '#059669' },
          width: 60,
          height: 60,
          boxShadow: 4,
          float: 'inline-end',
          display: isChatOpen && selectedUser ? 'none' : 'block',
        }}
      >
        <img src='/chat-icon.svg' alt='Chat Icon' />
      </IconButton>
      <AddMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        BASE_URL={BASE_URL}
        token={authToken}
        threadId={threadId || existingThreadId}
      />
    </Box>
  );
}
