/** Bottom toast offering to reload once a new service worker version is waiting. */
export function UpdateToast({
  needRefresh,
  onUpdate,
}: {
  needRefresh: boolean;
  onUpdate(): void;
}) {
  if (!needRefresh) return null;
  return (
    <div role="status" className="update-toast">
      <span>Доступно обновление</span>
      <button type="button" className="button-primary" onClick={onUpdate}>
        Обновить
      </button>
    </div>
  );
}
