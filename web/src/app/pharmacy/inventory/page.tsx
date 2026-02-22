'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { Package, Plus, Trash2, Save } from 'lucide-react';
import { PHARMACY_UPDATE_INVENTORY } from '@/graphql/pharmacy-portal';

// Spec: Phase 15 — Pharmacy inventory management

interface InventoryItem {
    medicationName: string;
    quantity: number;
    isInStock: boolean;
    genericName?: string;
}

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newQuantity, setNewQuantity] = useState(0);
    const [newInStock, setNewInStock] = useState(true);

    const [updateInventory, { loading: saving }] = useMutation(PHARMACY_UPDATE_INVENTORY, {
        onCompleted: () => {
            // Items saved
        },
    });

    const handleAdd = () => {
        if (!newName.trim()) return;
        setItems((prev) => [
            ...prev,
            { medicationName: newName, quantity: newQuantity, isInStock: newInStock },
        ]);
        setNewName('');
        setNewQuantity(0);
        setNewInStock(true);
        setShowAddForm(false);
    };

    const handleRemove = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        updateInventory({
            variables: {
                updates: items.map((item) => ({
                    medicationName: item.medicationName,
                    isInStock: item.isInStock,
                    quantity: item.quantity,
                })),
            },
        });
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Empty state — shown when no items and form is closed */}
            {items.length === 0 && !showAddForm && (
                <div className="text-center py-16">
                    <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-1">
                        No Inventory Items
                    </p>
                    <p className="text-sm text-neutral-400 mb-6">
                        Add medications to track stock levels
                    </p>
                    <button
                        data-testid="add-medication-button"
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Medication
                    </button>
                </div>
            )}

            {/* Header — shown when form is open or items exist */}
            {(showAddForm || items.length > 0) && (
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            Inventory
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage medication stock levels
                        </p>
                    </div>
                    <button
                        data-testid="add-medication-button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>
            )}

            {/* Add form */}
            {showAddForm && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-muted/50 border border-border rounded-xl"
                >
                    <div className="space-y-3">
                        <input
                            data-testid="med-name-input"
                            type="text"
                            placeholder="Medication name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        />
                        <input
                            data-testid="med-quantity-input"
                            type="number"
                            placeholder="Quantity"
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        />
                        <label
                            data-testid="med-stock-toggle"
                            className="flex items-center gap-2 text-sm"
                        >
                            <input
                                type="checkbox"
                                checked={newInStock}
                                onChange={(e) => setNewInStock(e.target.checked)}
                                className="w-4 h-4"
                            />
                            In Stock
                        </label>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                            Add Item
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-3 py-2 text-sm text-neutral-500 hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>

                    <button
                        data-testid="save-inventory-button"
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-3 w-full py-2.5 bg-foreground text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-foreground/90 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save All'}
                    </button>
                </motion.div>
            )}

            {/* Items list */}
            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-premium p-3 flex items-center justify-between"
                        >
                            <div>
                                <p className="font-medium text-foreground text-sm">
                                    {item.medicationName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">
                                        Qty: {item.quantity}
                                    </span>
                                    <span
                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            item.isInStock
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}
                                    >
                                        {item.isInStock ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemove(index)}
                                className="p-1.5 text-neutral-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}

                    <button
                        data-testid="save-inventory-button"
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Inventory'}
                    </button>
                </div>
            )}
        </div>
    );
}
