# Implementation Plan: Complete All 91 Tests

## Goal
Fix all failing features across all phases to achieve 91/91 test pass rate.

## Priority Fixes

### 🔴 CRITICAL - Core Functionality
1. **Client Edit/Delete** - Buttons non-functional (Phase 5)
2. **Settings Page** - Complete placeholder, needs full implementation (Phase 8)
3. **Mobile Navigation** - Hamburger menu for mobile (Phase 10)

### 🟡 HIGH - Missing Features
4. **Export Features** - CSV/JSON for responses, clients, suppliers, audit logs
5. **Date Filtering** - Responses and Audit Logs pages
6. **Project Filter** - Responses page
7. **Search Integration** - Connect global search to tables

### 🟢 MEDIUM - Enhancements
8. **Response Detail View** - Modal for viewing response details
9. **Console Errors** - Fix hydration mismatch and CSP violations

## Implementation Order

### Phase 1: Client Management Fixes
- Add EditClientButton component with modal
- Fix DeleteClientButton (already has confirm, verify it works)
- Add ExportClientsButton component

### Phase 2: Settings Page Implementation
- General Settings (site name, description, timezone)
- API Keys section (display anon key, regenerate option)
- Notification Settings (email alerts, webhook URLs)
- Save/Reset functionality
- Danger Zone (clear all data)

### Phase 3: Export Features
- Add CSV export for responses
- Add JSON export for responses
- Add Export button for clients
- Add Export button for suppliers
- Add Export button for audit logs

### Phase 4: Filtering Enhancements
- Add date range filter to responses
- Add project filter dropdown to responses
- Add date range filter to audit logs
- Connect global search to filter tables

### Phase 5: Mobile Navigation
- Add hamburger menu component
- Make sidebar collapsible on mobile
- Add overlay for mobile menu

### Phase 6: Response Detail View
- Add detail modal for response rows
- Show all response fields in organized layout

### Phase 7: Console Error Fixes
- Fix hydration mismatch in layout
- Fix CSP violations

## Files to Create/Modify

### New Files
- `components/EditClientButton.tsx`
- `components/ExportClientsButton.tsx`
- `components/ExportSuppliersButton.tsx`
- `components/ExportAuditLogsButton.tsx`
- `components/ResponseDetailModal.tsx`
- `components/MobileMenu.tsx`
- `components/HamburgerMenu.tsx`

### Modified Files
- `app/admin/clients/page.tsx` - Add edit button, export, fix delete
- `app/admin/settings/page.tsx` - Complete rewrite with full settings
- `app/admin/responses/page.tsx` - Add CSV/JSON export, date filter, project filter
- `app/admin/audit-logs/page.tsx` - Add date filter, export
- `app/admin/suppliers/page.tsx` - Add export button
- `app/admin/layout.tsx` - Add mobile menu support
- `components/AdminResponsesTable.tsx` - Add detail view, pagination

## Verification
After all fixes, re-run browser testing to verify all 91 tests pass.
