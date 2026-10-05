using Fili.Samples.Orders;

var service = new OrderService<int>(new MemoryStore());
var unused = 42;
bool placed = await service.PlaceAsync("ABC-1234");
Console.WriteLine(placed ? "placed" : "rejected");

sealed class MemoryStore : IOrderStore
{
    public Task SaveAsync(string sku, decimal total) => Task.CompletedTask;
}
