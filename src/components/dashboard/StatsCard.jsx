import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, gradient, iconBg, iconColor, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full transform translate-x-12 -translate-y-12`} />
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
              <CardTitle className="text-4xl font-bold text-slate-900">
                {value}
              </CardTitle>
              {subtitle && (
                <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${iconBg} shadow-lg`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}