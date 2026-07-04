"use client";

import { useState, useEffect, useRef } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, User, Truck, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  shipment_id: string;
  sender_type: "customer" | "driver" | "company";
  content: string;
  created_at: string;
}

interface ChatWidgetProps {
  shipmentId: string;
  currentUserType: "customer" | "driver" | "company";
  className?: string;
}

export function ChatWidget({ shipmentId, currentUserType, className }: ChatWidgetProps) {
  const { supabase } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [supabase, shipmentId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${shipmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `shipment_id=eq.${shipmentId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, shipmentId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from("messages").insert({
      shipment_id: shipmentId,
      sender_type: currentUserType,
      content: content,
    });

    if (error) {
      console.error("Error sending message:", error);
      // In a real app we might show a toast and restore the message text
    }
  };

  const getSenderIcon = (type: string) => {
    switch (type) {
      case "driver":
        return <Truck className="h-4 w-4" />;
      case "company":
        return <ShieldAlert className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSenderLabel = (type: string) => {
    switch (type) {
      case "driver":
        return "Conductor";
      case "company":
        return "Soporte Vorian";
      default:
        return "Cliente";
    }
  };

  return (
    <div className={cn("flex flex-col h-[400px] border rounded-xl overflow-hidden bg-background shadow-sm", className)}>
      <div className="bg-muted p-3 border-b flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-sm font-semibold">Chat del Envío</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
            <Send className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Sin mensajes aún.<br/>Escribe para iniciar la coordinación.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === currentUserType;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                {!isMe && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 ml-1">
                    {getSenderIcon(msg.sender_type)}
                    <span>{getSenderLabel(msg.sender_type)}</span>
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted border rounded-tl-sm text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 mx-1 opacity-70">
                  {format(new Date(msg.created_at), "HH:mm")}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-background border-t flex gap-2">
        <Input
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border-muted-foreground/20 focus-visible:ring-primary"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim()} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
