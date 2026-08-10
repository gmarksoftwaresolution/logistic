import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LanguageContext } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { SharedHeader } from '../components/SharedHeader';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { inventoryService, InventorySummary, InventoryOrder } from '../services/inventoryService';

export default function StockManagementScreen({ navigation }: { navigation?: any }) {
  const context = useContext(LanguageContext);
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<'in_stock' | 'out_stock'>('in_stock');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [summary, setSummary] = useState<InventorySummary>({
    success: true,
    inStockCount: 0,
    inStockWeight: 0,
    outStockCount: 0,
    outStockWeight: 0,
    breakdown: {
      inStock: { waitingForTransporter: 0, readyForBuyer: 0, returns: 0 },
      outStock: { handedToTransporter: 0, deliveredToBuyer: 0 },
    },
  });

  const [inStockOrders, setInStockOrders] = useState<InventoryOrder[]>([]);
  const [outStockOrders, setOutStockOrders] = useState<InventoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = context?.t || ((k: string) => k);

  const fetchInventoryData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [sumRes, inRes, outRes] = await Promise.all([
        inventoryService.getSummary().catch(() => null),
        inventoryService.getInStockOrders().catch(() => []),
        inventoryService.getOutStockOrders().catch(() => []),
      ]);

      if (sumRes) setSummary(sumRes);
      if (Array.isArray(inRes)) setInStockOrders(inRes);
      if (Array.isArray(outRes)) setOutStockOrders(outRes);
    } catch (err) {
      console.warn('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventoryData(true);
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInventoryData(false);
  };

  // Reset subfilter when switching main tab
  const handleTabChange = (tab: 'in_stock' | 'out_stock') => {
    setActiveTab(tab);
    setSubFilter('all');
  };

  // Filter current list based on subfilter and search query
  const currentOrders = activeTab === 'in_stock' ? inStockOrders : outStockOrders;

  const filteredOrders = currentOrders.filter((o) => {
    // 1. Sub-filter check
    if (activeTab === 'in_stock') {
      if (subFilter === 'transporter' && o.stockType !== 'WAITING_FOR_TRANSPORTER') return false;
      if (subFilter === 'buyer' && o.stockType !== 'READY_FOR_BUYER') return false;
      if (subFilter === 'returns' && o.stockType !== 'RETURN_AT_SHG') return false;
    } else {
      if (subFilter === 'transporter' && o.stockType !== 'HANDED_TO_TRANSPORTER') return false;
      if (subFilter === 'buyer' && o.stockType !== 'DELIVERED_TO_BUYER') return false;
      if (subFilter === 'returns' && o.stockType !== 'COMPLETED_RETURN') return false;
    }

    // 2. Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchId = (o.orderNumber || o.orderId || '').toLowerCase().includes(q);
      const matchSeller = (o.seller?.fullName || '').toLowerCase().includes(q) || (o.seller?.village || '').toLowerCase().includes(q);
      const matchBuyer = (o.buyer?.fullName || '').toLowerCase().includes(q) || (o.buyer?.village || '').toLowerCase().includes(q);
      const matchTrans = (o.transporter?.fullName || '').toLowerCase().includes(q);
      const matchBarcode = (o.barcode || '').toLowerCase().includes(q);
      const matchProduct = (o.parcels || []).some((p) => (p.productName || '').toLowerCase().includes(q));

      return matchId || matchSeller || matchBuyer || matchTrans || matchBarcode || matchProduct;
    }

    return true;
  });

  const formatIST = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleViewOrderDetails = (order: InventoryOrder) => {
    const fullOrder = {
      id: order.uuid || order.id,
      orderId: order.orderNumber || order.orderId || order.id,
      orderNumber: order.orderNumber || order.orderId || order.id,
      barcode: order.barcode || `QR-2026-${order.orderNumber}-PCL-1`,
      status: order.mainStatus || 'PARCEL_AT_SHG',
      mainStatus: order.mainStatus || 'PARCEL_AT_SHG',
      legType: order.legType || 'pickup',
      phase: order.legType === 'drop' ? 'DROP' : 'PICKUP',
      seller: order.seller,
      buyer: order.buyer,
      sellerName: order.seller?.fullName || 'Seller',
      sellerPhone: order.seller?.phoneNumber,
      sellerVillage: order.seller?.village,
      sellerAddress: order.seller?.fullAddress,
      buyerName: order.buyer?.fullName || 'Buyer',
      buyerPhone: order.buyer?.phoneNumber,
      buyerVillage: order.buyer?.village,
      buyerAddress: order.buyer?.fullAddress,
      address: order.buyer?.fullAddress || order.seller?.fullAddress || '',
      sourceAddress: order.seller?.fullAddress || '',
      parcels: (order.parcels && order.parcels.length > 0) ? order.parcels : [{
        id: 1,
        parcelId: `PCL-${order.orderNumber}-1`,
        productName: 'Agricultural Goods',
        weight: order.totalWeight || 2.5,
        parcelStatus: order.mainStatus || 'PARCEL_AT_SHG',
      }],
      totalWeight: order.totalWeight,
      weight: order.totalWeight,
      transporter: order.transporter,
      transporterName: order.transporter?.fullName,
      transporterMobile: order.transporter?.phoneNumber,
      vehicleNumber: order.transporter?.vehicleNumber,
    };

    if (navigation) {
      try {
        navigation.navigate('OrderDetails', { order: fullOrder });
      } catch {
        navigation.navigate('Orders', { screen: 'OrderDetails', params: { order: fullOrder } });
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Top Navbar */}
      <SharedHeader
        title={t('home_inventory') || 'Home Inventory'}
        subtitle={t('inventory_subtitle') || 'Live Stock at your Center'}
        navigation={navigation}
      />

      <ScrollView
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <SharedRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ========================================================= */}
        {/* 1. TOP SUMMARY CARDS (IN-STOCK & OUT-STOCK TOGGLES)       */}
        {/* ========================================================= */}
        <View className="flex-row gap-3 mb-4">
          {/* IN-STOCK CARD */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleTabChange('in_stock')}
            className={`flex-1 p-4 rounded-3xl border ${
              activeTab === 'in_stock'
                ? 'bg-[#073318] border-[#073318] shadow-md shadow-emerald-900/30'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View
                className={`p-2 rounded-2xl ${
                  activeTab === 'in_stock' ? 'bg-[#B2D534]/20' : 'bg-emerald-50'
                }`}
              >
                <Ionicons
                  name="cube"
                  size={20}
                  color={activeTab === 'in_stock' ? '#B2D534' : '#059669'}
                />
              </View>
              <View
                className={`px-2.5 py-0.5 rounded-full ${
                  activeTab === 'in_stock' ? 'bg-white/15' : 'bg-emerald-100'
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    activeTab === 'in_stock' ? 'text-[#B2D534]' : 'text-emerald-800'
                  }`}
                >
                  {summary.inStockWeight} KG
                </Text>
              </View>
            </View>

            <Text
              className={`text-2xl font-black ${
                activeTab === 'in_stock' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {summary.inStockCount}
            </Text>
            <Text
              className={`text-xs font-bold mt-0.5 uppercase tracking-wider ${
                activeTab === 'in_stock' ? 'text-[#B2D534]' : 'text-emerald-700'
              }`}
            >
              IN-STOCK
            </Text>
            <Text
              className={`text-[10px] font-medium mt-1 leading-tight ${
                activeTab === 'in_stock' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Physically at Center
            </Text>
          </TouchableOpacity>

          {/* OUT-STOCK CARD */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleTabChange('out_stock')}
            className={`flex-1 p-4 rounded-3xl border ${
              activeTab === 'out_stock'
                ? 'bg-[#0F172A] border-[#0F172A] shadow-md shadow-slate-900/30'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View
                className={`p-2 rounded-2xl ${
                  activeTab === 'out_stock' ? 'bg-sky-400/20' : 'bg-sky-50'
                }`}
              >
                <Ionicons
                  name="paper-plane"
                  size={20}
                  color={activeTab === 'out_stock' ? '#38BDF8' : '#0284C7'}
                />
              </View>
              <View
                className={`px-2.5 py-0.5 rounded-full ${
                  activeTab === 'out_stock' ? 'bg-white/15' : 'bg-sky-100'
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    activeTab === 'out_stock' ? 'text-sky-300' : 'text-sky-800'
                  }`}
                >
                  {summary.outStockWeight} KG
                </Text>
              </View>
            </View>

            <Text
              className={`text-2xl font-black ${
                activeTab === 'out_stock' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {summary.outStockCount}
            </Text>
            <Text
              className={`text-xs font-bold mt-0.5 uppercase tracking-wider ${
                activeTab === 'out_stock' ? 'text-sky-300' : 'text-sky-700'
              }`}
            >
              OUT-STOCK
            </Text>
            <Text
              className={`text-[10px] font-medium mt-1 leading-tight ${
                activeTab === 'out_stock' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Dispatched & Delivered
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* 2. SEARCH BAR                                             */}
        {/* ========================================================= */}
        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-3 py-2 mb-3 shadow-xs">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search Order ID, Product Name, Barcode..."
            placeholderTextColor="#94A3B8"
            className="flex-1 text-xs text-slate-800 font-semibold ml-2.5 py-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ========================================================= */}
        {/* 3. SUB-FILTER CHIPS                                       */}
        {/* ========================================================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {activeTab === 'in_stock' ? (
            <>
              <TouchableOpacity
                onPress={() => setSubFilter('all')}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  subFilter === 'all'
                    ? 'bg-[#073318] border-[#073318]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-extrabold ${
                    subFilter === 'all' ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  All In-Stock ({inStockOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSubFilter('transporter')}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  subFilter === 'transporter'
                    ? 'bg-amber-600 border-amber-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-extrabold ${
                    subFilter === 'transporter' ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  Waiting for Transporter ({summary.breakdown.inStock.waitingForTransporter})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSubFilter('buyer')}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  subFilter === 'buyer'
                    ? 'bg-sky-600 border-sky-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-extrabold ${
                    subFilter === 'buyer' ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  Ready for Buyer ({summary.breakdown.inStock.readyForBuyer})
                </Text>
              </TouchableOpacity>

              {summary.breakdown.inStock.returns > 0 && (
                <TouchableOpacity
                  onPress={() => setSubFilter('returns')}
                  className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                    subFilter === 'returns'
                      ? 'bg-rose-600 border-rose-600'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-extrabold ${
                      subFilter === 'returns' ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    Returns ({summary.breakdown.inStock.returns})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setSubFilter('all')}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  subFilter === 'all'
                    ? 'bg-[#0F172A] border-[#0F172A]'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-extrabold ${
                    subFilter === 'all' ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  All Out-Stock ({outStockOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSubFilter('transporter')}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  subFilter === 'transporter'
                    ? 'bg-sky-600 border-sky-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-extrabold ${
                    subFilter === 'transporter' ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  To Transporter / Hub ({summary.breakdown.outStock.handedToTransporter})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSubFilter('buyer')}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  subFilter === 'buyer'
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[11px] font-extrabold ${
                    subFilter === 'buyer' ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  Delivered to Buyer ({summary.breakdown.outStock.deliveredToBuyer})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* ========================================================= */}
        {/* 4. INVENTORY ORDERS LIST                                  */}
        {/* ========================================================= */}
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#073318" />
            <Text className="text-xs font-bold text-slate-400 mt-3">
              Loading inventory records...
            </Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-3">
              <Ionicons
                name={activeTab === 'in_stock' ? 'cube-outline' : 'paper-plane-outline'}
                size={32}
                color="#94A3B8"
              />
            </View>
            <Text className="text-base font-black text-slate-800 text-center">
              {activeTab === 'in_stock'
                ? 'No In-Stock Items at Center'
                : 'No Out-Stock Items Found'}
            </Text>
            <Text className="text-xs text-slate-500 font-medium text-center mt-1 max-w-[260px]">
              {activeTab === 'in_stock'
                ? 'When you pick up parcels from sellers or receive drop shipments, they will appear here in stock.'
                : 'Dispatched and delivered orders will be recorded here.'}
            </Text>
          </View>
        ) : (
          <View className="space-y-4 pb-12">
            {filteredOrders.map((order, idx) => {
              const isWaitingTransporter = order.stockType === 'WAITING_FOR_TRANSPORTER';
              const isReadyBuyer = order.stockType === 'READY_FOR_BUYER';

              return (
                <View
                  key={order.id || idx}
                  className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3"
                >
                  {/* Card Header: Order ID & Status Badge */}
                  <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                    <View className="flex-row items-center gap-2">
                      <View className="bg-[#073318] p-2 rounded-xl">
                        <Ionicons name="cube" size={16} color="#B2D534" />
                      </View>
                      <View>
                        <Text className="text-sm font-black text-slate-900 tracking-tight">
                          ORD-{order.orderNumber}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-bold">
                          {order.barcode}
                        </Text>
                      </View>
                    </View>

                    {/* Stock Status Badge */}
                    <View
                      className="px-2.5 py-1 rounded-full flex-row items-center gap-1.5"
                      style={{ backgroundColor: `${order.stockBadgeColor}15` }}
                    >
                      <View
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: order.stockBadgeColor }}
                      />
                      <Text
                        className="text-[10px] font-black uppercase"
                        style={{ color: order.stockBadgeColor }}
                      >
                        {order.stockStatusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Products List Box */}
                  <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="file-tray-stacked-outline" size={13} color="#475569" />
                        <Text className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Products List ({order.parcels?.length || 1})
                        </Text>
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400">
                        Qty: {order.totalQty || 1}
                      </Text>
                    </View>

                    <View className="space-y-1.5 pt-0.5">
                      {(order.parcels && order.parcels.length > 0) ? (
                        order.parcels.map((p, pIdx) => (
                          <View
                            key={p.parcelId || pIdx}
                            className="flex-row items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-100"
                          >
                            <View className="flex-row items-center gap-2 flex-1 pr-2">
                              <View className="w-4 h-4 rounded-full bg-emerald-50 items-center justify-center">
                                <Text className="text-[9px] font-black text-emerald-700">
                                  {pIdx + 1}
                                </Text>
                              </View>
                              <Text className="text-xs font-black text-slate-800 flex-1 truncate">
                                {p.productName || 'Agricultural Package'}
                              </Text>
                            </View>
                            <Text className="text-[11px] font-black text-[#073318]">
                              {p.weight} KG
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View className="flex-row items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-100">
                          <Text className="text-xs font-black text-slate-800">
                            Agricultural Goods
                          </Text>
                          <Text className="text-[11px] font-black text-[#073318]">
                            {order.totalWeight} KG
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Stats Bar: Total Weight & Live Indian Date/Time */}
                  <View className="flex-row gap-2">
                    {/* Total Weight */}
                    <View className="flex-1 bg-emerald-50/70 border border-emerald-100 rounded-2xl p-2.5 flex-row items-center gap-2">
                      <View className="bg-emerald-100 p-1.5 rounded-xl">
                        <Ionicons name="scale-outline" size={14} color="#059669" />
                      </View>
                      <View>
                        <Text className="text-[9px] font-bold text-emerald-800 uppercase">
                          Total Weight
                        </Text>
                        <Text className="text-xs font-black text-emerald-950">
                          {order.totalWeight} KG
                        </Text>
                      </View>
                    </View>

                    {/* Date and Time (IST) */}
                    <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex-row items-center gap-2">
                      <View className="bg-slate-200/70 p-1.5 rounded-xl">
                        <Ionicons name="time-outline" size={14} color="#475569" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[9px] font-bold text-slate-500 uppercase">
                          {activeTab === 'in_stock' ? 'Pickup Date & Time' : 'Dispatch Date & Time'}
                        </Text>
                        <Text className="text-[10px] font-black text-slate-800 truncate">
                          {formatIST(order.storedSince || order.dispatchedAt || order.deliveredAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons: View Details & Handover/Deliver */}
                  <View className="pt-1 flex-row items-center justify-between gap-2">
                    {/* View Details Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleViewOrderDetails(order)}
                      className="flex-1 bg-slate-900 py-3 px-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
                    >
                      <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                      <Text className="text-xs font-black text-white">View Details</Text>
                    </TouchableOpacity>

                    {/* Contextual Action Button */}
                    {isWaitingTransporter && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          if (navigation) {
                            navigation.navigate('Scanner');
                          }
                        }}
                        className="bg-[#073318] py-3 px-4 rounded-2xl flex-row items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Ionicons name="qr-code-outline" size={15} color="#B2D534" />
                        <Text className="text-xs font-black text-[#B2D534]">Handover</Text>
                      </TouchableOpacity>
                    )}

                    {isReadyBuyer && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          if (navigation) {
                            navigation.navigate('Drop');
                          }
                        }}
                        className="bg-[#0284C7] py-3 px-4 rounded-2xl flex-row items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                        <Text className="text-xs font-black text-white">Deliver (OTP)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
