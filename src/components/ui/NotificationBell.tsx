'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // 1. Fetch initial unread count
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', userId)
        .is('read_at', null);
      if (count !== null) setUnreadCount(count);
    };

    fetchUnread();

    // 2. Subscribe to realtime notifications safely scoped via RLS
    // The RLS policy "Users can only view their own notifications" ensures we only get our own events.
    const channel = supabase
      .channel(`notifications:user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new;
          setUnreadCount((c) => c + 1);
          
          // Display toast when online
          toast(newNotif.title, {
            icon: newNotif.priority === 'CRITICAL' ? '⚠️' : '🔔',
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="relative cursor-pointer p-2 rounded-full hover:bg-white/5 transition-colors">
      <Bell className="w-5 h-5 text-gray-400" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}
