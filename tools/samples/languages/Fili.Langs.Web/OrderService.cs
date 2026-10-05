namespace Fili.Langs.Web;

public record Order(int Id, string Name);

public class OrderService
{
    public Task<List<Order>> GetAsync() => Task.FromResult(new List<Order> { new(1, "First") });
}
