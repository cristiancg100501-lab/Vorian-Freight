"use client";

import { useState, useEffect, useRef } from "react";
import { useSupabase, useUser } from "@/components/providers/supabase-provider";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ShipmentChatProps {
  shipmentId: string;
  isCompanyRole: boolean;
  triggerButton?: React.ReactNode;
}

export function ShipmentChat({ shipmentId, isCompanyRole, triggerButton }: ShipmentChatProps) {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes iniciales y suscribirse a Realtime
  useEffect(() => {
    if (!isOpen) return;

    let channel: any;
    setIsLoading(true);

    const fetchAndSubscribe = async () => {
      // 1. Fetch
      const { data, error } = await supabase
        .from("shipment_messages")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: true });
      
      if (data) setMessages(data);
      setIsLoading(false);

      // 2. Subscribe
      channel = supabase
        .channel(`shipment_chat_${shipmentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "shipment_messages",
            filter: `shipment_id=eq.${shipmentId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();
    };

    fetchAndSubscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isOpen, shipmentId, supabase]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    const msgText = newMessage.trim();
    setNewMessage("");

    try {
      await supabase.from("shipment_messages").insert({
        shipment_id: shipmentId,
        sender_id: user.id,
        message: msgText,
        is_from_company: isCompanyRole,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10">
            <MessageCircle className="w-4 h-4" />
            Chat con {isCompanyRole ? "Cliente" : "Transporte"}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Chat Directo - Envío #{shipmentId.substring(0, 6).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
              <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No hay mensajes aún.</p>
              <p className="text-xs mt-1 text-center px-4">
                Usa este chat para coordinar detalles directamente con la {isCompanyRole ? "contraparte (el cliente)" : "empresa de transporte"}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              // Si el mensaje es de la misma entidad que está viendo la pantalla (ej. empresa y is_from_company=true)
              const isMine = msg.is_from_company === isCompanyRole;
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm shadow-md"
                        : "bg-background border rounded-bl-sm shadow-sm"
                    )}
                  >
                    {!isMine && (
                       <p className="text-[10px] font-bold opacity-60 mb-1 uppercase tracking-wider">
                         {isCompanyRole ? "Cliente" : "Transporte"}
                       </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <span className="text-[10px] opacity-70 mt-1 block text-right">
                      {format(new Date(msg.created_at), "HH:mm")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t bg-background shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="bg-primary text-primary-foreground p-2 rounded-lg disabled:opacity-50 flex items-center justify-center w-12 hover:bg-primary/90 transition-colors"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
