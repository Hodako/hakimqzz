import * as actions from "./rpc-actions";
import { queueOfflineAction, startBackgroundSync } from "./offline-sync";

// Helper to determine if we are offline or if a network error occurs
async function runWriteAction<T>(actionName: string, fn: (args: any) => Promise<T>, args: any): Promise<T | any> {
  if (typeof window !== "undefined" && !navigator.onLine) {
    queueOfflineAction(actionName, args);
    return { success: true, offline: true, id: crypto.randomUUID() };
  }
  try {
    return await fn(args);
  } catch (err) {
    if (typeof window !== "undefined") {
      console.warn(`Write action ${actionName} failed, queuing offline:`, err);
      queueOfflineAction(actionName, args);
      return { success: true, offline: true, id: crypto.randomUUID() };
    }
    throw err;
  }
}

// Register server actions map for background syncing
if (typeof window !== "undefined") {
  startBackgroundSync(actions as any);
}

// Export READS directly
export const getMeFn = actions.getMeFn;
export const getProductsFn = actions.getProductsFn;
export const getPartiesFn = actions.getPartiesFn;
export const getPartyFn = actions.getPartyFn;
export const getAllPartyReceivablesFn = actions.getAllPartyReceivablesFn;
export const getAllPartyPayablesFn = actions.getAllPartyPayablesFn;
export const getAllPayableSettlementsFn = actions.getAllPayableSettlementsFn;
export const getPartyReceivablesFn = actions.getPartyReceivablesFn;
export const getPartyPayablesFn = actions.getPartyPayablesFn;
export const getPayableSettlementsFn = actions.getPayableSettlementsFn;
export const getSalesFn = actions.getSalesFn;
export const getSalesForPartyFn = actions.getSalesForPartyFn;
export const getReturnsFn = actions.getReturnsFn;
export const getPurchasesFn = actions.getPurchasesFn;
export const getExpensesFn = actions.getExpensesFn;
export const getPaymentsForPartyFn = actions.getPaymentsForPartyFn;
export const getAllPaymentsFn = actions.getAllPaymentsFn;
export const getSomitiFn = actions.getSomitiFn;
export const getWithdrawalsFn = actions.getWithdrawalsFn;
export const getCashboxFn = actions.getCashboxFn;
export const getRemindersFn = actions.getRemindersFn;

// Auth / network-only writes (usually need internet, so we don't sync offline)
export const loginFn = actions.loginFn;
export const registerFn = actions.registerFn;
export const logoutFn = actions.logoutFn;
export const changeMyPasswordFn = actions.changeMyPasswordFn;
export const verifyOwnerPasswordFn = actions.verifyOwnerPasswordFn;
export const uploadImageFn = actions.uploadImageFn;
export const bulkExportToGoogleSheetsFn = actions.bulkExportToGoogleSheetsFn;
export const createProfileFn = actions.createProfileFn;
export const switchProfileFn = actions.switchProfileFn;
export const importProfileModuleFn = actions.importProfileModuleFn;

// Write Actions with Offline support
export const createProductFn = (args: any) => runWriteAction("createProductFn", actions.createProductFn, args);
export const updateProductFn = (args: any) => runWriteAction("updateProductFn", actions.updateProductFn, args);
export const deleteProductFn = (args: any) => runWriteAction("deleteProductFn", actions.deleteProductFn, args);
export const archiveProductFn = (args: any) => runWriteAction("archiveProductFn", actions.archiveProductFn, args);

export const createPartyFn = (args: any) => runWriteAction("createPartyFn", actions.createPartyFn, args);
export const updatePartyFn = (args: any) => runWriteAction("updatePartyFn", actions.updatePartyFn, args);
export const deletePartyFn = (args: any) => runWriteAction("deletePartyFn", actions.deletePartyFn, args);
export const archivePartyFn = (args: any) => runWriteAction("archivePartyFn", actions.archivePartyFn, args);

export const createPartyReceivableFn = (args: any) => runWriteAction("createPartyReceivableFn", actions.createPartyReceivableFn, args);
export const createPartyPayableFn = (args: any) => runWriteAction("createPartyPayableFn", actions.createPartyPayableFn, args);
export const deletePartyReceivableFn = (args: any) => runWriteAction("deletePartyReceivableFn", actions.deletePartyReceivableFn, args);
export const deletePartyPayableFn = (args: any) => runWriteAction("deletePartyPayableFn", actions.deletePartyPayableFn, args);

export const createPayableSettlementFn = (args: any) => runWriteAction("createPayableSettlementFn", actions.createPayableSettlementFn, args);
export const deletePayableSettlementFn = (args: any) => runWriteAction("deletePayableSettlementFn", actions.deletePayableSettlementFn, args);

export const createSaleFn = (args: any) => runWriteAction("createSaleFn", actions.createSaleFn, args);
export const deleteSaleFn = (args: any) => runWriteAction("deleteSaleFn", actions.deleteSaleFn, args);
export const editSaleFn = (args: any) => runWriteAction("editSaleFn", actions.editSaleFn, args);

export const updateUserAvatarFn = (args: any) => runWriteAction("updateUserAvatarFn", actions.updateUserAvatarFn, args);
export const createReturnFn = (args: any) => runWriteAction("createReturnFn", actions.createReturnFn, args);
export const createDirectProductReturnFn = (args: any) => runWriteAction("createDirectProductReturnFn", actions.createDirectProductReturnFn, args);
export const deleteReturnFn = (args: any) => runWriteAction("deleteReturnFn", actions.deleteReturnFn, args);

export const createPurchaseFn = (args: any) => runWriteAction("createPurchaseFn", actions.createPurchaseFn, args);
export const deletePurchaseFn = (args: any) => runWriteAction("deletePurchaseFn", actions.deletePurchaseFn, args);

export const createExpenseFn = (args: any) => runWriteAction("createExpenseFn", actions.createExpenseFn, args);
export const deleteExpenseFn = (args: any) => runWriteAction("deleteExpenseFn", actions.deleteExpenseFn, args);

export const createPaymentFn = (args: any) => runWriteAction("createPaymentFn", actions.createPaymentFn, args);
export const deletePaymentFn = (args: any) => runWriteAction("deletePaymentFn", actions.deletePaymentFn, args);

export const createSomitiFn = (args: any) => runWriteAction("createSomitiFn", actions.createSomitiFn, args);
export const updateSomitiFn = (args: any) => runWriteAction("updateSomitiFn", actions.updateSomitiFn, args);
export const deleteSomitiFn = (args: any) => runWriteAction("deleteSomitiFn", actions.deleteSomitiFn, args);
export const renameSomitiFn = (args: any) => runWriteAction("renameSomitiFn", actions.renameSomitiFn, args);
export const deleteSomitiFnByName = (args: any) => runWriteAction("deleteSomitiFnByName", actions.deleteSomitiFnByName, args);

export const createWithdrawalFn = (args: any) => runWriteAction("createWithdrawalFn", actions.createWithdrawalFn, args);

export const createCashboxFn = (args: any) => runWriteAction("createCashboxFn", actions.createCashboxFn, args);

export const createReminderFn = (args: any) => runWriteAction("createReminderFn", actions.createReminderFn, args);
export const toggleReminderFn = (args: any) => runWriteAction("toggleReminderFn", actions.toggleReminderFn, args);
export const deleteReminderFn = (args: any) => runWriteAction("deleteReminderFn", actions.deleteReminderFn, args);

// Reset Actions (require network normally, but proxy anyway)
export const emptyCashboxFn = actions.emptyCashboxFn;
export const resetProductsFn = actions.resetProductsFn;
export const resetSalesFn = actions.resetSalesFn;
export const resetPurchasesFn = actions.resetPurchasesFn;
export const resetSomitiFn = actions.resetSomitiFn;
export const resetExpensesFn = actions.resetExpensesFn;
export const resetPartiesFn = actions.resetPartiesFn;
export const resetAllDataFn = actions.resetAllDataFn;
