import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosClient } from '../api/axiosClient';
import { useSocketData } from '../../realtime/socketHooks';

interface CurrencyContextType {
  currencySymbol: string;
  formatCurrency: (amount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currencySymbol: '$',
  formatCurrency: (amount: number | string) => `$${Number(amount).toFixed(2)}`,
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  const fetchSettings = async () => {
    try {
      const res = await axiosClient.get('/admin/settings');
      if (res.data?.data?.restaurant_currency) {
        setCurrencySymbol(res.data.data.restaurant_currency);
      }
    } catch (err) {
      console.error('Failed to fetch currency settings', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useSocketData('settings.updated', (settings: any) => {
    if (settings && settings.restaurant_currency) {
      setCurrencySymbol(settings.restaurant_currency);
    }
  });

  const formatCurrency = (amount: number | string) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return `${currencySymbol}0.00`;
    
    // Check if it's Rupee, then formatting might be Rs 100.00 instead of Rs100.00
    const separator = (currencySymbol.toLowerCase() === 'rs' || currencySymbol.toLowerCase() === 'lkr') ? ' ' : '';
    
    return `${currencySymbol}${separator}${numericAmount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencySymbol, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
