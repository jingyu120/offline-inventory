import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Box, Text, Card } from '@burma-inventory/ui-components';
import {
  Send,
  Bot,
  User,
  HelpCircle,
  MessageSquare,
} from 'lucide-react-native';
import { database } from '../../database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq } from 'drizzle-orm';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function ViberSimulator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: '🇲🇲 Viber Chatbot Simulator Active.\n\nType "?help" to list valid queries or type "?info [Shop Name]" to query shop status, churn analytics, and AI SKU order recommendations directly.',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const input = inputText.trim();
    setInputText('');
    setLoading(true);

    // Simulate bot parsing after 800ms
    setTimeout(async () => {
      let botResponse = '';
      if (input.toLowerCase() === '?help') {
        botResponse = `🤖 *Viber Bot Instructions*:\n\n1. *?info [Shop Name]*: Query detailed profile for a shop.\n   Example: \`?info City Mart Junction City\`\n2. *?help*: Display this instructions dialog.`;
      } else if (input.toLowerCase().startsWith('?info ')) {
        const queryShopName = input.substring(6).trim();
        try {
          const shops = await database.select().from(sqliteSchema.shops);
          const foundShop = shops.find((s: any) =>
            s.name.toLowerCase().includes(queryShopName.toLowerCase()),
          );

          if (foundShop) {
            // Get prediction logs
            const preds = await database
              .select()
              .from(sqliteSchema.prediction_logs);
            const pred = preds.find((p: any) => p.shop_id === foundShop.id);

            // Get recommended orders
            const recs = await database
              .select()
              .from(sqliteSchema.recommended_orders);
            const rec = recs.find((r: any) => r.shop_id === foundShop.id);

            let itemDetail: any = null;
            if (rec) {
              try {
                const itemsList = await database
                  .select()
                  .from(sqliteSchema.items)
                  .where(eq(sqliteSchema.items.id, rec.item_id));
                itemDetail = itemsList[0];
              } catch (err) {
                console.warn('Failed to load item detail', err);
              }
            }

            botResponse = `🏪 *Shop Found: ${foundShop.name}*\n📍 *Address*: ${foundShop.address}\n💰 *Lifetime Value*: K${foundShop.lifetime_value.toLocaleString()}\n📈 *Sentiment Trend*: ${foundShop.sentiment_trend}\n\n🔮 *Gemma 4 Predictive Analytics*:\n• Churn Risk Score: ${pred ? (pred.churn_risk * 100).toFixed(0) : '35'}%\n• Stockout Risk Score: ${pred ? (pred.stockout_risk * 100).toFixed(0) : '15'}%\n\n📦 *AI Recommended Order*:\n• SKU: ${itemDetail ? itemDetail.sku : 'N/A'}\n• Product: ${itemDetail ? itemDetail.name : 'N/A'}\n• Suggested Qty: ${rec ? rec.quantity : 24} units\n• AI Confidence: ${rec ? (rec.confidence * 100).toFixed(0) : '89'}%`;
          } else {
            botResponse = `❌ Shop "${queryShopName}" was not found in the database. Please check the spelling or type "?info [part of name]".`;
          }
        } catch (e) {
          console.error(e);
          botResponse =
            '⚠️ Database query failed while searching for shop details.';
        }
      } else {
        botResponse = `🤖 *Gemma AI Bot*:\nCommand not recognized. Type "?help" for a list of available query triggers.`;
      }

      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: botResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    // Scroll to bottom when messages list changes
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  return (
    <Box flex={1} bg="mainBackground" p="m">
      <Box mb="m">
        <Text variant="header" fontSize={24}>
          💬 Viber Chatbot Simulator
        </Text>
        <Text variant="bodySecondary">
          Simulate Viber chatbot client orders and Gemma 4 AI predictions
        </Text>
      </Box>

      {/* Chat Logs Window */}
      <Card
        flex={1}
        p="m"
        mb="m"
        borderColor="borderColor"
        borderWidth={1}
        bg="secondaryBackground"
      >
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <Box
                key={msg.id}
                alignSelf={isBot ? 'flex-start' : 'flex-end'}
                bg={isBot ? 'cardBackground' : 'primaryButton'}
                p="m"
                borderRadius="m"
                mb="m"
                maxWidth="80%"
                style={
                  isBot
                    ? {
                        borderBottomLeftRadius: 0,
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                      }
                    : { borderBottomRightRadius: 0 }
                }
              >
                <Box flexDirection="row" alignItems="center" mb="xs">
                  {isBot ? (
                    <Bot
                      size={14}
                      stroke="#5A31F4"
                      style={{ marginRight: 6 }}
                    />
                  ) : (
                    <User size={14} stroke="#FFF" style={{ marginRight: 6 }} />
                  )}
                  <Text
                    variant="bodySecondary"
                    fontWeight="bold"
                    fontSize={10}
                    style={{ color: isBot ? '#5A31F4' : '#FFF' }}
                  >
                    {isBot ? 'Viber Bot' : 'Representative'}
                  </Text>
                </Box>
                <Text
                  variant="body"
                  style={{ color: isBot ? '#1E293B' : '#FFF', lineHeight: 20 }}
                >
                  {msg.text}
                </Text>
                <Text
                  alignSelf="flex-end"
                  fontSize={8}
                  style={{ color: isBot ? '#64748B' : '#E2E8F0', marginTop: 4 }}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Box>
            );
          })}
          {loading && (
            <Box
              alignSelf="flex-start"
              bg="cardBackground"
              p="s"
              borderRadius="m"
              mb="m"
              flexDirection="row"
              alignItems="center"
            >
              <ActivityIndicator
                size="small"
                color="#5A31F4"
                style={{ marginRight: 8 }}
              />
              <Text variant="bodySecondary" fontSize={12}>
                Bot is parsing...
              </Text>
            </Box>
          )}
        </ScrollView>
      </Card>

      {/* Input controls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Box flexDirection="row" alignItems="center">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type Viber message or command (e.g. ?help)..."
            placeholderTextColor="#94A3B8"
            onSubmitEditing={handleSend}
            style={{
              flex: 1,
              height: 48,
              borderColor: '#CBD5E1',
              borderWidth: 1,
              borderRadius: 24,
              paddingHorizontal: 20,
              fontSize: 14,
              color: '#1E293B',
              backgroundColor: '#FFF',
              marginRight: 10,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#5A31F4',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Send size={18} stroke="#FFF" />
          </TouchableOpacity>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
}
export default ViberSimulator;
