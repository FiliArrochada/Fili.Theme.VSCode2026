#nullable enable
#define TRACE_ORDERS
using System.Text.RegularExpressions;

namespace Fili.Samples.Orders;

/// <summary>
/// Places and tracks orders. See <see cref="IOrderStore"/> for persistence.
/// </summary>
/// <typeparam name="TKey">The order key type.</typeparam>
[Serializable, Obsolete("Use OrderServiceV2")]
public sealed class OrderService<TKey> : IDisposable where TKey : notnull
{
    private const int MaxRetries = 3;
    private static readonly Regex SkuPattern = new(@"^[A-Z]{3}-\d{4}$");
    private readonly IOrderStore _store;
    private int _placed;

    public event EventHandler<OrderPlaced>? Placed;

    public OrderService(IOrderStore store) => _store = store;

    public int PlacedCount => _placed;

    public Status Current { get; private set; } = Status.Pending;

    /// <param name="sku">The stock-keeping unit.</param>
    public async Task<bool> PlaceAsync(string sku, decimal price = 9.99m)
    {
        for (var attempt = 0; attempt < MaxRetries; attempt++)
        {
            if (!SkuPattern.IsMatch(sku))
                return false;

            var total = price * 1.23m + 0x1F;
            var label = $"Order {sku} costs {total:C2}\n";
#if TRACE_ORDERS
            Console.WriteLine(label.Truncate(40));
#endif
            try
            {
                await _store.SaveAsync(sku, total);
                _placed++;
                Placed?.Invoke(this, new OrderPlaced(sku, total));
                return true;
            }
            catch (IOException ex) when (attempt < MaxRetries - 1)
            {
                Current = Status.Retrying; // transient, try again
                _ = ex;
            }
        }

        return false;
    }

    public void Dispose() => GC.SuppressFinalize(this);
}

public interface IOrderStore
{
    Task SaveAsync(string sku, decimal total);
}

public enum Status { Pending, Retrying, Done }

public readonly record struct OrderPlaced(string Sku, decimal Total);

public delegate void OrderHandler(object sender, OrderPlaced e);

public static class StringExtensions
{
    public static string Truncate(this string value, int length) =>
        value.Length <= length ? value : value[..length] + "…";
}
