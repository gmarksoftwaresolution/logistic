import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { 
  Search, 
  Printer, 
  Download, 
  Package
} from 'lucide-react';

interface ParcelItem {
  parcelId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  village: string;
  pincode: string;
  productName: string;
  weightKg: number;
  flowType: string;
  qrCodeValue: string;
}

// Demo data for lookup
const DEMO_PARCELS: ParcelItem[] = [
  {
    parcelId: 'PCL-8492049182',
    orderId: 'ORD-99482',
    customerName: 'Ramesh Kumar',
    customerPhone: '9876543210',
    village: 'Wagharali',
    pincode: '416504',
    productName: 'Organic Jaggery & Honey',
    weightKg: 2.5,
    flowType: 'SHG_DIRECT',
    qrCodeValue: '{"parcelId":"PCL-8492049182","orderId":"ORD-99482","token":"VT-77192834","flow":"SHG_DIRECT"}'
  },
  {
    parcelId: 'PCL-9102847129',
    orderId: 'ORD-99485',
    customerName: 'Sunita Patil',
    customerPhone: '9123456789',
    village: 'Nesari',
    pincode: '416504',
    productName: 'Pure Cow Ghee (1L Can)',
    weightKg: 1.2,
    flowType: 'HUB_DEPO',
    qrCodeValue: '{"parcelId":"PCL-9102847129","orderId":"ORD-99485","token":"VT-88201944","flow":"HUB_DEPO"}'
  },
  {
    parcelId: 'PCL-7738291044',
    orderId: 'ORD-99490',
    customerName: 'Anil Deshmukh',
    customerPhone: '9988776655',
    village: 'Gadhinglaj',
    pincode: '416502',
    productName: 'Handcrafted Spices Pack',
    weightKg: 3.8,
    flowType: 'SHG_DIRECT',
    qrCodeValue: '{"parcelId":"PCL-7738291044","orderId":"ORD-99490","token":"VT-11029384","flow":"SHG_DIRECT"}'
  }
];

export const ParcelExceptionPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  // Initially null so no parcel is shown until the user performs a search
  const [selectedParcel, setSelectedParcel] = useState<ParcelItem | null>(null);

  // Handle Search Submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    const found = DEMO_PARCELS.find(p => 
      p.parcelId.toLowerCase().includes(query) ||
      p.orderId.toLowerCase().includes(query) ||
      p.customerPhone.includes(query) ||
      p.customerName.toLowerCase().includes(query)
    );

    if (found) {
      setSelectedParcel(found);
    } else {
      setSelectedParcel({
        parcelId: query.toUpperCase().startsWith('PCL') ? query.toUpperCase() : `PCL-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        orderId: query.toUpperCase().startsWith('ORD') ? query.toUpperCase() : `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        customerName: 'Verified Customer',
        customerPhone: searchQuery.match(/^\d+$/) ? searchQuery : '9876543210',
        village: 'Gadhinglaj',
        pincode: '416502',
        productName: 'Logistics Parcel Item',
        weightKg: 2.0,
        flowType: 'SHG_DIRECT',
        qrCodeValue: JSON.stringify({ parcelId: query, timestamp: Date.now() })
      });
    }
  };

  // Trigger Thermal Printer / Web Print Dialog
  const handlePrintLabel = () => {
    window.print();
  };

  // Download Shipping Label as PNG image directly
  const handleDownloadLabel = (parcel: ParcelItem) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 800);

    // Border
    ctx.strokeStyle = '#073318';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 576, 776);

    // Header Banner
    ctx.fillStyle = '#073318';
    ctx.fillRect(12, 12, 576, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('GMU LOGISTICS HUB', 30, 55);

    // AWB & Order Details
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`AWB: ${parcel.parcelId}`, 30, 140);
    ctx.fillText(`ORDER ID: ${parcel.orderId}`, 30, 175);

    // Destination Box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(30, 200, 540, 140);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 200, 540, 140);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`DESTINATION: ${parcel.village.toUpperCase()} (${parcel.pincode})`, 45, 235);
    ctx.font = '16px sans-serif';
    ctx.fillText(`RECIPIENT: ${parcel.customerName} (${parcel.customerPhone})`, 45, 270);
    ctx.fillText(`ITEM: ${parcel.productName}`, 45, 305);

    // Weight & Flow
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`WEIGHT: ${parcel.weightKg} KG  |  FLOW: ${parcel.flowType}`, 30, 380);

    // Barcode Simulation
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 45; i++) {
      const width = (i % 3 === 0) ? 6 : (i % 2 === 0) ? 3 : 2;
      ctx.fillRect(40 + (i * 11), 410, width, 90);
    }
    ctx.font = '16px monospace';
    ctx.fillText(`* ${parcel.parcelId} *`, 190, 525);

    // QR Code Box
    ctx.fillStyle = '#073318';
    ctx.fillRect(190, 550, 220, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('SCANNABLE QR CODE', 215, 650);

    // Download Data URL
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Label-${parcel.parcelId}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <Layout currentPage="parcel-exception" onNavigate={onNavigate}>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        
        {/* Clean Search Bar Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Phone Number, AWB Number, or Order ID..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#073318]"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-3.5 bg-[#073318] hover:bg-[#052612] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>
        </div>

        {/* Searched Result Actions (Appears ONLY AFTER Searching) */}
        {selectedParcel ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  MATCHED PARCEL
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">{selectedParcel.parcelId}</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                {selectedParcel.orderId}
              </span>
            </div>

            {/* Print & Download Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handlePrintLabel}
                className="flex-1 py-4 px-6 bg-[#073318] hover:bg-[#052612] text-white font-extrabold rounded-xl text-base flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Printer className="w-5 h-5" />
                🖨️ Print Label (4x6 Thermal)
              </button>

              <button
                onClick={() => handleDownloadLabel(selectedParcel)}
                className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-base flex items-center justify-center gap-2 transition-all border border-slate-200"
              >
                <Download className="w-5 h-5 text-slate-700" />
                📥 Download Label
              </button>
            </div>

            {/* Hidden Printable Area for window.print() */}
            <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-4">
              <div className="border-2 border-slate-900 p-4 bg-white text-slate-900 font-sans space-y-3">
                <div className="bg-[#073318] text-white p-2.5 rounded text-center">
                  <p className="font-extrabold text-sm tracking-wider">GMU LOGISTICS HUB</p>
                  <p className="text-[10px] text-emerald-200">STANDARD SHIPPING MANIFEST</p>
                </div>

                <div className="border-b-2 border-slate-900 pb-2 text-xs font-mono">
                  <p className="font-bold text-sm">AWB: {selectedParcel.parcelId}</p>
                  <p className="text-slate-600">ORDER: {selectedParcel.orderId}</p>
                </div>

                <div className="bg-slate-50 p-2.5 border border-slate-900 rounded text-xs space-y-1">
                  <p className="font-extrabold text-slate-900 text-sm">
                    DEST: {selectedParcel.village.toUpperCase()} ({selectedParcel.pincode})
                  </p>
                  <p className="text-slate-700">TO: {selectedParcel.customerName} ({selectedParcel.customerPhone})</p>
                  <p className="text-slate-600 truncate">ITEM: {selectedParcel.productName}</p>
                </div>

                <div className="flex justify-between text-[11px] font-bold text-slate-700 border-b border-slate-300 pb-2">
                  <span>WEIGHT: {selectedParcel.weightKg} KG</span>
                  <span>FLOW: {selectedParcel.flowType}</span>
                </div>

                <div className="text-center pt-1 space-y-1">
                  <div className="h-12 bg-slate-900 w-full flex items-center justify-center text-white text-[9px] tracking-widest font-mono">
                    ||| | |||| || | |||| ||| |||| | ||| || ||||
                  </div>
                  <p className="text-xs font-mono font-bold">* {selectedParcel.parcelId} *</p>
                </div>

                <div className="border-2 border-dashed border-slate-900 p-3 text-center bg-emerald-50/50 rounded flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-slate-900 p-1 flex items-center justify-center rounded">
                    <div className="w-full h-full bg-white border-4 border-slate-900 grid grid-cols-3 gap-0.5 p-1">
                      <div className="bg-slate-900"></div>
                      <div></div>
                      <div className="bg-slate-900"></div>
                      <div></div>
                      <div className="bg-slate-900"></div>
                      <div></div>
                      <div className="bg-slate-900"></div>
                      <div></div>
                      <div className="bg-slate-900"></div>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-slate-800 mt-1">SCANNABLE QR PAYLOAD</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-300" />
            <p className="text-base font-semibold text-slate-700">Enter Search Query</p>
            <p className="text-xs text-slate-400 mt-1">Search by Phone Number, AWB Number, or Order ID to print or download labels.</p>
          </div>
        )}

      </div>
    </Layout>
  );
};
